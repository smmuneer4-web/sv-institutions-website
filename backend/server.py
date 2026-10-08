from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import logging
import uuid
import bcrypt
import jwt
from pathlib import Path
from typing import Optional, List, Annotated, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, BeforeValidator
from bson import ObjectId
from pymongo import ReturnDocument
from datetime import datetime, timezone, timedelta
import base64
import json
import re
from io import BytesIO
from reportlab.lib.pagesizes import A4, A5, landscape
from reportlab.lib.colors import HexColor, white
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas as pdf_canvas

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
fs_bucket = AsyncIOMotorGridFSBucket(db, bucket_name="media_fs")
MAX_VIDEO_BYTES = 40 * 1024 * 1024  # 40 MB raw video uploads (GridFS — no BSON doc limit)

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    secret = os.environ.get("JWT_SECRET")
    if not secret:
        raise HTTPException(
            status_code=500,
            detail="Server misconfiguration: JWT_SECRET is not set in the hosting environment variables",
        )
    return secret


def coerce_object_id(v):
    if isinstance(v, ObjectId):
        return str(v)
    return v


PyObjectId = Annotated[str, BeforeValidator(coerce_object_id)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()))

    def to_mongo(self):
        data = self.model_dump()
        data["_id"] = data.pop("id")
        return data

    @classmethod
    def from_mongo(cls, doc):
        if doc and "_id" in doc:
            doc = {**doc, "id": str(doc["_id"])}
            doc.pop("_id")
        return cls(**doc)


# ---------------- Enquiries (quick admission enquiry form) ----------------

class Enquiry(BaseDocument):
    name: str
    phone: str
    email: str
    college: str
    program: str
    city: str = ""
    message: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class EnquiryCreate(BaseModel):
    name: str
    phone: str
    email: str
    college: str
    program: str
    city: str = ""
    message: str = ""


@api_router.get("/")
async def root():
    return {"message": "S V College of Nursing API"}


@api_router.post("/enquiries", response_model=Enquiry)
async def create_enquiry(input: EnquiryCreate):
    enquiry = Enquiry(**input.model_dump())
    await db.enquiries.insert_one(enquiry.to_mongo())
    return enquiry



# ---------------- Admin auth (JWT, httpOnly cookies) ----------------

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        # stored hash is malformed (e.g. plain text) — treat as mismatch
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=8),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


class LoginRequest(BaseModel):
    email: str
    password: str


@api_router.post("/auth/login")
async def login(request: Request, response: Response, input: LoginRequest):
    email = input.email.strip().lower()
    identifier = f"{request_client_ip(request)}:{email}"
    attempts = await db.login_attempts.find_one({"identifier": identifier})
    if attempts and attempts.get("count", 0) >= 5 and datetime.now(timezone.utc) < attempts.get("locked_until", datetime.now(timezone.utc)):
        raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(input.password, user.get("password_hash", "")):
        count = (attempts or {}).get("count", 0) + 1
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$set": {"count": count, "locked_until": datetime.now(timezone.utc) + timedelta(minutes=15)}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_one({"identifier": identifier})
    access_token = create_access_token(str(user["_id"]), user["email"])
    refresh_token = create_refresh_token(str(user["_id"]))
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=8 * 3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=7 * 24 * 3600, path="/")
    return {"id": str(user["_id"]), "email": user["email"], "name": user.get("name", "Admin"), "role": user.get("role", "admin"), "access_token": access_token, "refresh_token": refresh_token}


def request_client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return {"message": "Logged out"}


@api_router.get("/auth/me")
async def me(request: Request, user: dict = Depends(get_current_user)):
    return user


class RefreshRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    refresh_token: str = ""


@api_router.post("/auth/refresh")
async def refresh(request: Request, response: Response, input: Optional[RefreshRequest] = None):
    token = request.cookies.get("refresh_token")
    if not token and input is not None:
        token = input.refresh_token
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access_token = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=8 * 3600, path="/")
        return {"id": str(user["_id"]), "email": user["email"], "name": user.get("name", "Admin"), "role": user.get("role", "admin"), "access_token": access_token, "refresh_token": token}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired, please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").strip().lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admissions Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc),
        })
        logger.info(f"Seeded admin user {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )
        logger.info(f"Updated admin password hash for {admin_email}")




@api_router.get("/enquiries", response_model=List[Enquiry])
async def list_enquiries(user: dict = Depends(get_current_user)):
    docs = await db.enquiries.find().sort("created_at", -1).to_list(1000)
    return [Enquiry.from_mongo(d) for d in docs]


@api_router.delete("/enquiries/{enquiry_id}")
async def delete_enquiry(enquiry_id: str, user: dict = Depends(get_current_user)):
    result = await db.enquiries.delete_one({"_id": enquiry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    return {"message": "Enquiry deleted"}


# ---------------- Applications (full admission application portal) ----------------

VALID_STATUSES = ["submitted", "shortlist", "approved", "rejected"]

# ---------------- Fee receipts (branded PDF, one per payment) ----------------

INSTITUTE_NAME = "S V GROUP OF INSTITUTIONS"
INSTITUTE_TAGLINE = "Excellence in Health Education · Bengaluru"
INSTITUTE_ADDRESS = "80 Feet Ring Road, Near Bangalore University, Mallathahalli Bus Stop, Bangalore - 560056"
INSTITUTE_EMAIL = "admissions@svinstitutions.co.in"
INSTITUTE_PHONE = "+91 90378 34632"
LOGO_PATH = ROOT_DIR / "assets" / "sv-logo.png"

_ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
         "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
_TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]


def _two_digit_words(n: int) -> str:
    if n < 20:
        return _ONES[n]
    return (_TENS[n // 10] + (" " + _ONES[n % 10] if n % 10 else "")).strip()


def _indian_words(n: int) -> str:
    if n >= 10 ** 7:
        words = _indian_words(n // 10 ** 7) + " Crore"
        if n % 10 ** 7:
            words += " " + _indian_words(n % 10 ** 7)
        return words
    parts = []
    if (lakh := (n // 10 ** 5) % 100):
        parts.append(_two_digit_words(lakh) + " Lakh")
    if (thousand := (n // 10 ** 3) % 100):
        parts.append(_two_digit_words(thousand) + " Thousand")
    if (hundred := (n // 100) % 10):
        parts.append(_ONES[hundred] + " Hundred")
    if (rest := n % 100):
        parts.append(_two_digit_words(rest))
    return " ".join(parts)


def amount_in_words(amount: float) -> str:
    n = int(round(float(amount)))
    if n <= 0:
        return "Zero Rupees Only"
    return f"{_indian_words(n)} Rupees Only"


def _inr_format(n: float) -> str:
    s = str(int(round(float(n))))
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        groups = []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        if head:
            groups.insert(0, head)
        s = ",".join(groups) + "," + tail
    return s


def make_receipt_no(doc: dict) -> str:
    number = (doc.get("application_number") or "").strip()
    serial = number.rsplit("-", 1)[-1] if "-" in number else (number or "000000")
    return f"SVR-{serial}-{uuid.uuid4().hex[:6].upper()}"


async def _ensure_receipt_no(application_id: str, doc: dict, payment: dict) -> str:
    if payment.get("receipt_no"):
        return payment["receipt_no"]
    receipt_no = make_receipt_no(doc)
    await db.applications.update_one(
        {"_id": application_id, "payments.id": payment["id"]},
        {"$set": {"payments.$.receipt_no": receipt_no}},
    )
    return receipt_no


def _build_receipt_pdf(app_doc: dict, payment: dict, receipt_no: str, generated_at: str, contact: dict | None = None) -> bytes:
    # A5 landscape, gold double-frame template
    W, H = landscape(A5)
    CX = 34
    CW = W - 2 * CX
    MAROON, INK = HexColor(0x6E0A28), HexColor(0x2B0B14)
    GREY, LINE = HexColor(0x6B7280), HexColor(0xE5E7EB)
    CREAM, PAGEBG = HexColor(0xFBF3E6), HexColor(0xF5EBDC)
    GOLD = HexColor(0xC9A66B)
    BRAND_NAME = (contact or {}).get("name") or INSTITUTE_NAME
    BRAND_TAGLINE = (contact or {}).get("tagline") or INSTITUTE_TAGLINE
    BRAND_EMAIL = (contact or {}).get("email") or INSTITUTE_EMAIL
    BRAND_PHONE = (contact or {}).get("phone") or INSTITUTE_PHONE

    buf = BytesIO()
    c = pdf_canvas.Canvas(buf, pagesize=(W, H))

    # Page background + gold double frame
    c.setFillColor(PAGEBG)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    c.setFillColor(white)
    c.rect(16, 16, W - 32, H - 32, stroke=0, fill=1)
    c.setStrokeColor(GOLD)
    c.setLineWidth(2.2)
    c.rect(10, 10, W - 20, H - 20, stroke=1, fill=0)
    c.setLineWidth(0.8)
    c.rect(16, 16, W - 32, H - 32, stroke=1, fill=0)

    schedule = _find_sub(app_doc.get("schedules", []), payment.get("schedule_id") or "") if payment.get("schedule_id") else None
    fee_type = payment.get("fee_type") or (schedule["label"] if schedule else "Academic Fees")
    amount = float(payment.get("amount") or 0)
    planned = float(app_doc.get("fee_total") or 0) or sum(float(v or 0) for v in (app_doc.get("fee_years") or {}).values())
    collected_total = sum(float(p.get("amount") or 0) for p in app_doc.get("payments", []))
    balance = max(planned - collected_total, 0.0)

    # Header: logo, name, tagline, contact
    if LOGO_PATH.exists():
        c.drawImage(str(LOGO_PATH), CX, H - 86, width=52, height=52, mask="auto", preserveAspectRatio=True)
    tx = CX + 64
    c.setFillColor(MAROON)
    c.setFont("Helvetica-Bold", 15.5)
    c.drawString(tx, H - 52, BRAND_NAME)
    c.setFont("Helvetica-Oblique", 8.5)
    c.drawString(tx, H - 65, BRAND_TAGLINE)
    c.setFillColor(GREY)
    c.setFont("Helvetica", 7.5)
    c.drawString(tx, H - 77, f"{BRAND_EMAIL} · {BRAND_PHONE}")

    # Banner row: maroon title band left, receipt no + date right
    by = H - 118
    c.setFillColor(MAROON)
    c.rect(CX, by, 218, 24, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(CX + 12, by + 8, "PAYMENT RECEIPT")
    c.setFillColor(MAROON)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawRightString(W - CX, by + 16, f"Receipt No.: {receipt_no}")
    c.drawRightString(W - CX, by + 6, f"Date: {_fmt_date_long(payment.get('date') or payment.get('created_at') or '')}")

    # Received with thanks
    y = by - 20
    c.setFillColor(GREY)
    c.setFont("Helvetica-Bold", 6.5)
    c.drawString(CX, y, "RECEIVED WITH THANKS FROM")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(CX, y - 16, app_doc.get("full_name") or "—")
    c.setFillColor(HexColor(0x374151))
    c.setFont("Helvetica", 8)
    c.drawString(CX, y - 29, f"Application ID: {app_doc.get('application_number') or '—'}  ·  Mobile: {app_doc.get('mobile') or '—'}")
    c.drawString(CX, y - 41, f"{app_doc.get('programme') or '—'}  ·  {app_doc.get('college') or '—'}")
    c.setStrokeColor(LINE)
    c.setLineWidth(0.7)
    c.line(CX, y - 50, W - CX, y - 50)

    # Amount box (cream, gold border) + mode (right)
    aby, abh, abw = y - 104, 46, 252
    c.setFillColor(CREAM)
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    c.roundRect(CX, aby, abw, abh, 4, stroke=1, fill=1)
    c.setFillColor(GREY)
    c.setFont("Helvetica-Bold", 6.5)
    c.drawString(CX + 10, aby + abh - 13, "AMOUNT RECEIVED")
    c.setFillColor(MAROON)
    c.setFont("Helvetica-Bold", 19)
    c.drawString(CX + 10, aby + 8, f"INR {_inr_format(amount)}")
    c.setFillColor(GREY)
    c.setFont("Helvetica-Bold", 6.5)
    c.drawRightString(W - CX, aby + abh - 13, "MODE")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 12)
    c.drawRightString(W - CX, aby + 20, payment.get("method") or "—")
    c.setFillColor(GREY)
    c.setFont("Helvetica", 7.5)
    c.drawRightString(W - CX, aby + 9, fee_type)

    # Amount in words
    c.setFillColor(INK)
    words = f"Rupees (in words): {amount_in_words(amount)}"
    wsize = 8
    while c.stringWidth(words, "Helvetica-Oblique", wsize) > CW and wsize > 6:
        wsize -= 0.25
    c.setFont("Helvetica-Oblique", wsize)
    c.drawString(CX, aby - 14, words)

    # Financial breakdown — alternating cream bands
    fy = aby - 30
    row_h = 15.5
    fin_rows = [
        ("Reference / UTR", payment.get("reference") or "—", INK, False),
        ("Remarks", payment.get("remarks") or "—", INK, False),
        ("Fees Planned", f"INR {_inr_format(planned)}", INK, True),
        ("Total Collected (incl. this)", f"INR {_inr_format(collected_total)}", INK, True),
        ("Balance", f"INR {_inr_format(balance)}", MAROON, True),
    ]
    for i, (label, value, color, bold) in enumerate(fin_rows):
        if i % 2 == 0:
            c.setFillColor(CREAM)
            c.rect(CX, fy - row_h + 3, CW, row_h, stroke=0, fill=1)
        c.setFillColor(GREY)
        c.setFont("Helvetica", 7.5)
        c.drawString(CX + 8, fy - 7, label)
        c.setFillColor(color)
        c.setFont("Helvetica-Bold" if bold else "Helvetica", 7.5)
        c.drawRightString(W - CX - 8, fy - 7, value)
        fy -= row_h

    # Signatory
    sy = fy - 16
    c.setStrokeColor(HexColor(0x9CA3AF))
    c.setLineWidth(0.7)
    c.line(W - CX - 150, sy, W - CX, sy)
    c.setFillColor(GREY)
    c.setFont("Helvetica", 7)
    c.drawCentredString(W - CX - 75, sy - 10, "Authorised Signatory")

    # Footer
    c.setFillColor(GREY)
    c.setFont("Helvetica", 6.5)
    c.drawString(CX, 24, "This is a system-generated receipt. Please retain for your records.")
    c.drawRightString(W - CX, 24, f"Generated on {generated_at}")

    c.showPage()
    c.save()
    return buf.getvalue()


def _fmt_date_long(iso: str) -> str:
    try:
        return datetime.fromisoformat(iso).strftime("%d %B %Y")
    except (ValueError, TypeError):
        return iso or "—"


def _generated_stamp() -> str:
    now = datetime.now()
    clock = now.strftime("%I:%M:%S %p").lstrip("0").replace(" AM", " am").replace(" PM", " pm")
    return f"{now.day}/{now.month}/{now.year}, {clock}"


class Application(BaseDocument):
    application_number: str = ""
    status: str = "submitted"
    admin_notes: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    full_name: str = ""
    mobile: str = ""
    email: str = ""
    dob: str = ""
    gender: str = ""
    aadhaar: str = ""
    nationality: str = "Indian"
    religion: str = ""
    caste: str = ""
    blood_group: str = ""
    photo: str = ""

    programme: str = ""
    college: str = ""
    hostel: str = "No"
    transport: str = "No"

    address_line1: str = ""
    address_line2: str = ""
    city: str = ""
    state: str = ""
    pincode: str = ""
    guardian_name: str = ""
    guardian_mobile: str = ""
    guardian_email: str = ""
    guardian_occupation: str = ""
    emergency_name: str = ""
    emergency_mobile: str = ""

    b10_board: str = ""
    b10_year: str = ""
    b10_pct: str = ""
    b10_school: str = ""
    b12_board: str = ""
    b12_year: str = ""
    b12_stream: str = ""
    b12_pct: str = ""
    b12_school: str = ""
    other_qualification: str = ""
    marksheet10: str = ""
    marksheet12: str = ""

    payment_mode: str = ""
    payment_reference: str = ""
    payment_receiver: str = ""
    referral_source: str = ""
    payment_remarks: str = ""

    declaration_text: str = ""
    agree_accurate: bool = False
    agree_communication: bool = False
    signature: str = ""

    fee_total: float = 0.0
    scholarship_amount: float = 0.0
    payments: List[Dict[str, Any]] = Field(default_factory=list)
    fee_years: Dict[str, float] = Field(default_factory=dict)
    schedules: List[Dict[str, Any]] = Field(default_factory=list)


class ApplicationCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    full_name: str = ""
    mobile: str = ""
    email: str = ""
    dob: str = ""
    gender: str = ""
    aadhaar: str = ""
    nationality: str = "Indian"
    religion: str = ""
    caste: str = ""
    blood_group: str = ""
    photo: str = ""
    programme: str = ""
    college: str = ""
    hostel: str = "No"
    transport: str = "No"
    address_line1: str = ""
    address_line2: str = ""
    city: str = ""
    state: str = ""
    pincode: str = ""
    guardian_name: str = ""
    guardian_mobile: str = ""
    guardian_email: str = ""
    guardian_occupation: str = ""
    emergency_name: str = ""
    emergency_mobile: str = ""
    b10_board: str = ""
    b10_year: str = ""
    b10_pct: str = ""
    b10_school: str = ""
    b12_board: str = ""
    b12_year: str = ""
    b12_stream: str = ""
    b12_pct: str = ""
    b12_school: str = ""
    other_qualification: str = ""
    marksheet10: str = ""
    marksheet12: str = ""
    payment_mode: str = ""
    payment_reference: str = ""
    payment_receiver: str = ""
    referral_source: str = ""
    payment_remarks: str = ""
    agree_accurate: bool = False
    agree_communication: bool = False
    signature: str = ""


class ApplicationUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    status: Optional[str] = None
    admin_notes: Optional[str] = None
    full_name: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    aadhaar: Optional[str] = None
    nationality: Optional[str] = None
    religion: Optional[str] = None
    caste: Optional[str] = None
    blood_group: Optional[str] = None
    programme: Optional[str] = None
    college: Optional[str] = None
    hostel: Optional[str] = None
    transport: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_mobile: Optional[str] = None
    guardian_email: Optional[str] = None
    guardian_occupation: Optional[str] = None
    emergency_name: Optional[str] = None
    emergency_mobile: Optional[str] = None
    b10_board: Optional[str] = None
    b10_year: Optional[str] = None
    b10_pct: Optional[str] = None
    b10_school: Optional[str] = None
    b12_board: Optional[str] = None
    b12_year: Optional[str] = None
    b12_stream: Optional[str] = None
    b12_pct: Optional[str] = None
    b12_school: Optional[str] = None
    other_qualification: Optional[str] = None
    marksheet10: Optional[str] = None
    marksheet12: Optional[str] = None
    payment_mode: Optional[str] = None
    payment_reference: Optional[str] = None
    payment_receiver: Optional[str] = None
    referral_source: Optional[str] = None
    payment_remarks: Optional[str] = None


APPLICATION_EDITABLE_FIELDS = (
    "full_name", "mobile", "email", "dob", "gender", "aadhaar", "nationality", "religion", "caste", "blood_group",
    "programme", "college", "hostel", "transport",
    "address_line1", "address_line2", "city", "state", "pincode",
    "guardian_name", "guardian_mobile", "guardian_email", "guardian_occupation", "emergency_name", "emergency_mobile",
    "b10_board", "b10_year", "b10_pct", "b10_school", "b12_board", "b12_year", "b12_stream", "b12_pct", "b12_school",
    "other_qualification", "marksheet10", "marksheet12",
    "payment_mode", "payment_reference", "payment_receiver", "referral_source", "payment_remarks",
)


@api_router.post("/applications", response_model=Application)
async def create_application(input: ApplicationCreate):
    errors = []
    if not input.full_name.strip():
        errors.append("Student full name is required")
    if len("".join(ch for ch in input.mobile if ch.isdigit())) < 10:
        errors.append("A valid 10-digit mobile number is required")
    if "@" not in input.email:
        errors.append("A valid email is required")
    if not input.programme or not input.college:
        errors.append("Programme and college selection are required")
    if not input.signature.strip() or not input.agree_accurate:
        errors.append("Declaration and signature are required")
    for f in ("photo", "marksheet10", "marksheet12"):
        if len(getattr(input, f) or "") > 2_000_000:
            errors.append("Uploaded image is too large. Please upload a smaller file.")
    if errors:
        raise HTTPException(status_code=422, detail=". ".join(errors))

    app_number = f"SVN-{datetime.now(timezone.utc).strftime('%Y%m')}-{uuid.uuid4().hex[:4].upper()}"
    application = Application(
        **input.model_dump(),
        application_number=app_number,
        declaration_text="I declare that the information provided in this application is true, complete and correct to the best of my knowledge and belief.",
    )
    await db.applications.insert_one(application.to_mongo())
    return application


@api_router.get("/applications", response_model=List[Application])
async def list_applications(user: dict = Depends(get_current_user)):
    docs = await db.applications.find().sort("created_at", -1).to_list(2000)
    return [Application.from_mongo(d) for d in docs]


@api_router.get("/applications/{application_id}", response_model=Application)
async def get_application(application_id: str, user: dict = Depends(get_current_user)):
    doc = await db.applications.find_one({"_id": application_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    return Application.from_mongo(doc)


@api_router.patch("/applications/{application_id}", response_model=Application)
async def update_application(application_id: str, input: ApplicationUpdate, user: dict = Depends(get_current_user)):
    updates = {}
    if input.status is not None:
        if input.status not in VALID_STATUSES:
            raise HTTPException(status_code=422, detail="Invalid status")
        updates["status"] = input.status
    if input.admin_notes is not None:
        updates["admin_notes"] = input.admin_notes
    for field in APPLICATION_EDITABLE_FIELDS:
        value = getattr(input, field, None)
        if value is not None:
            if field == "full_name" and not value.strip():
                continue
            if field in ("marksheet10", "marksheet12") and len(value or "") > 2_000_000:
                raise HTTPException(status_code=422, detail="Uploaded image is too large")
            updates[field] = value
    if not updates:
        raise HTTPException(status_code=422, detail="Nothing to update")
    doc = await db.applications.find_one_and_update(
        {"_id": application_id}, {"$set": updates}, return_document=ReturnDocument.AFTER
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    return Application.from_mongo(doc)


class FeePlanUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    fee_total: float = 0.0


class PaymentAdd(BaseModel):
    model_config = ConfigDict(extra="ignore")
    amount: float
    reference: str = ""
    schedule_id: str = ""
    method: str = ""
    remarks: str = ""
    date: str = ""
    fee_type: str = ""
    receiver: str = ""


@api_router.get("/applications/by-number/{application_number}", response_model=Application)
async def get_application_by_number(application_number: str, user: dict = Depends(get_current_user)):
    doc = await db.applications.find_one({"application_number": application_number})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    return Application.from_mongo(doc)


@api_router.get("/applications/track/{application_number}")
async def track_application_public(application_number: str):
    """Public status lookup for applicants (limited fields only)."""
    doc = await db.applications.find_one({"application_number": application_number.strip().upper()})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found. Please check the number and try again.")
    return {
        "application_number": doc.get("application_number", ""),
        "full_name": doc.get("full_name", ""),
        "programme": doc.get("programme", ""),
        "college": doc.get("college", ""),
        "status": doc.get("status", "submitted"),
        "created_at": doc.get("created_at", ""),
    }


@api_router.patch("/applications/{application_id}/fees", response_model=Application)
async def set_fee_plan(application_id: str, input: FeePlanUpdate, user: dict = Depends(get_current_user)):
    if input.fee_total < 0:
        raise HTTPException(status_code=422, detail="Fee amount cannot be negative")
    doc = await db.applications.find_one_and_update(
        {"_id": application_id}, {"$set": {"fee_total": input.fee_total}}, return_document=ReturnDocument.AFTER
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    return Application.from_mongo(doc)


@api_router.post("/applications/{application_id}/payments", response_model=Application)
async def add_payment(application_id: str, input: PaymentAdd, user: dict = Depends(get_current_user)):
    if input.amount <= 0:
        raise HTTPException(status_code=422, detail="Payment amount must be greater than zero")
    doc = await db.applications.find_one({"_id": application_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    payment = {
        "id": uuid.uuid4().hex,
        "amount": input.amount,
        "reference": input.reference,
        "schedule_id": input.schedule_id,
        "method": input.method,
        "remarks": input.remarks,
        "date": input.date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "fee_type": input.fee_type,
        "receiver": input.receiver,
        "receipt_no": make_receipt_no(doc),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "received_by": user.get("email", ""),
    }
    doc = await db.applications.find_one_and_update(
        {"_id": application_id}, {"$push": {"payments": payment}}, return_document=ReturnDocument.AFTER
    )
    return Application.from_mongo(doc)


class FeeYearsUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    fee_years: Dict[str, float] = Field(default_factory=dict)
    scholarship_amount: Optional[float] = None


@api_router.patch("/applications/{application_id}/fee-years", response_model=Application)
async def set_fee_years(application_id: str, input: FeeYearsUpdate, user: dict = Depends(get_current_user)):
    if any(v < 0 for v in input.fee_years.values()):
        raise HTTPException(status_code=422, detail="Fee amounts cannot be negative")
    scholarship = 0.0
    if input.scholarship_amount is not None:
        if input.scholarship_amount < 0:
            raise HTTPException(status_code=422, detail="Scholarship amount cannot be negative")
        scholarship = float(input.scholarship_amount)
    fee_total = max(0.0, float(sum(input.fee_years.values())) - scholarship)
    doc = await db.applications.find_one_and_update(
        {"_id": application_id},
        {"$set": {"fee_years": input.fee_years, "fee_total": fee_total, "scholarship_amount": scholarship}},
        return_document=ReturnDocument.AFTER,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    return Application.from_mongo(doc)


class ScheduleAdd(BaseModel):
    model_config = ConfigDict(extra="ignore")
    label: str
    amount: float
    due_date: str = ""
    remarks: str = ""


class ScheduleUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    label: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[str] = None
    remarks: Optional[str] = None


class PaymentUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    amount: Optional[float] = None
    reference: Optional[str] = None
    schedule_id: Optional[str] = None
    method: Optional[str] = None
    remarks: Optional[str] = None
    date: Optional[str] = None
    fee_type: Optional[str] = None
    receiver: Optional[str] = None


def _find_sub(items, item_id):
    return next((x for x in items if x.get("id") == item_id), None)


@api_router.post("/applications/{application_id}/schedules", response_model=Application)
async def add_schedule(application_id: str, input: ScheduleAdd, user: dict = Depends(get_current_user)):
    if input.amount <= 0:
        raise HTTPException(status_code=422, detail="Schedule amount must be greater than zero")
    if not input.label.strip():
        raise HTTPException(status_code=422, detail="Schedule label is required")
    item = {"id": uuid.uuid4().hex, "label": input.label.strip(), "amount": input.amount, "due_date": input.due_date, "remarks": input.remarks}
    doc = await db.applications.find_one_and_update(
        {"_id": application_id}, {"$push": {"schedules": item}}, return_document=ReturnDocument.AFTER
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    return Application.from_mongo(doc)


@api_router.patch("/applications/{application_id}/schedules/{schedule_id}", response_model=Application)
async def update_schedule(application_id: str, schedule_id: str, input: ScheduleUpdate, user: dict = Depends(get_current_user)):
    doc = await db.applications.find_one({"_id": application_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    items = doc.get("schedules", [])
    item = _find_sub(items, schedule_id)
    if not item:
        raise HTTPException(status_code=404, detail="Schedule not found")
    if input.label is not None:
        item["label"] = input.label.strip()
    if input.amount is not None:
        if input.amount <= 0:
            raise HTTPException(status_code=422, detail="Schedule amount must be greater than zero")
        item["amount"] = input.amount
    if input.due_date is not None:
        item["due_date"] = input.due_date
    if input.remarks is not None:
        item["remarks"] = input.remarks
    updated = await db.applications.find_one_and_update(
        {"_id": application_id}, {"$set": {"schedules": items}}, return_document=ReturnDocument.AFTER
    )
    return Application.from_mongo(updated)


@api_router.delete("/applications/{application_id}/schedules/{schedule_id}", response_model=Application)
async def delete_schedule(application_id: str, schedule_id: str, user: dict = Depends(get_current_user)):
    doc = await db.applications.find_one({"_id": application_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    items = [x for x in doc.get("schedules", []) if x.get("id") != schedule_id]
    updated = await db.applications.find_one_and_update(
        {"_id": application_id}, {"$set": {"schedules": items}}, return_document=ReturnDocument.AFTER
    )
    return Application.from_mongo(updated)


@api_router.patch("/applications/{application_id}/payments/{payment_id}", response_model=Application)
async def update_payment(application_id: str, payment_id: str, input: PaymentUpdate, user: dict = Depends(get_current_user)):
    doc = await db.applications.find_one({"_id": application_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    payments = doc.get("payments", [])
    for x in payments:
        x.setdefault("id", uuid.uuid4().hex)
    item = _find_sub(payments, payment_id)
    if not item:
        raise HTTPException(status_code=404, detail="Payment not found")
    if input.amount is not None:
        if input.amount <= 0:
            raise HTTPException(status_code=422, detail="Payment amount must be greater than zero")
        item["amount"] = input.amount
    for field in ("reference", "schedule_id", "method", "remarks", "date", "fee_type", "receiver"):
        if getattr(input, field) is not None:
            item[field] = getattr(input, field)
    updated = await db.applications.find_one_and_update(
        {"_id": application_id}, {"$set": {"payments": payments}}, return_document=ReturnDocument.AFTER
    )
    return Application.from_mongo(updated)


@api_router.delete("/applications/{application_id}/payments/{payment_id}", response_model=Application)
async def delete_payment(application_id: str, payment_id: str, user: dict = Depends(get_current_user)):
    doc = await db.applications.find_one({"_id": application_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    payments = doc.get("payments", [])
    for x in payments:
        x.setdefault("id", uuid.uuid4().hex)
    payments = [x for x in payments if x.get("id") != payment_id]
    updated = await db.applications.find_one_and_update(
        {"_id": application_id}, {"$set": {"payments": payments}}, return_document=ReturnDocument.AFTER
    )
    return Application.from_mongo(updated)


@api_router.get("/applications/{application_id}/payments/{payment_id}/receipt.pdf")
async def download_receipt(application_id: str, payment_id: str, user: dict = Depends(get_current_user)):
    doc = await db.applications.find_one({"_id": application_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    payment = _find_sub(doc.get("payments", []), payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    receipt_no = await _ensure_receipt_no(application_id, doc, payment)
    content = await get_site_content()
    pdf = _build_receipt_pdf(doc, payment, receipt_no, _generated_stamp(), contact=content.get("contact"))
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Receipt-{receipt_no}.pdf"'},
    )


# ---------------- Colleges & Courses (dynamic, admin-managed) ----------------

class CourseCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    duration: str = ""
    seats: int = 0
    eligibility: str = ""
    active: bool = True


class CourseUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    duration: Optional[str] = None
    seats: Optional[int] = None
    eligibility: Optional[str] = None
    active: Optional[bool] = None


class CollegeCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    campus: str = ""
    domain: str = ""
    active: bool = True
    courses: List[CourseCreate] = Field(default_factory=list)


class CollegeUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    campus: Optional[str] = None
    domain: Optional[str] = None
    active: Optional[bool] = None


def slugify(text: str) -> str:
    import re
    s = re.sub(r"[^a-zA-Z0-9]+", "-", (text or "").lower()).strip("-")
    return s[:40] or f"item-{uuid.uuid4().hex[:6]}"


async def ensure_unique_college_id(base_id: str) -> str:
    candidate, i = base_id, 2
    while await db.colleges.find_one({"id": candidate}):
        candidate = f"{base_id}-{i}"
        i += 1
    return candidate


@api_router.get("/colleges")
async def list_colleges_public():
    docs = await db.colleges.find({"active": {"$ne": False}}).sort("name", 1).to_list(200)
    out = []
    for d in docs:
        d.pop("_id", None)
        d["courses"] = [c for c in (d.get("courses") or []) if c.get("active", True)]
        out.append(d)
    return out


@api_router.get("/admin/colleges")
async def list_colleges_admin(user: dict = Depends(get_current_user)):
    docs = await db.colleges.find({}).sort("name", 1).to_list(200)
    for d in docs:
        d.pop("_id", None)
    return docs


@api_router.post("/admin/colleges")
async def create_college(body: CollegeCreate, user: dict = Depends(get_current_user)):
    if not body.name.strip():
        raise HTTPException(status_code=422, detail="College name is required")
    college_id = await ensure_unique_college_id(slugify(body.name))
    doc = {
        "id": college_id,
        "name": body.name.strip(),
        "campus": body.campus or "",
        "domain": body.domain or "",
        "active": body.active,
        "courses": [
            {"id": slugify(c.name), "name": c.name.strip(), "duration": c.duration, "seats": c.seats, "eligibility": c.eligibility, "active": c.active}
            for c in body.courses
        ],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.colleges.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.patch("/admin/colleges/{college_id}")
async def update_college(college_id: str, body: CollegeUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=422, detail="Nothing to update")
    doc = await db.colleges.find_one_and_update({"id": college_id}, {"$set": updates}, return_document=ReturnDocument.AFTER)
    if not doc:
        raise HTTPException(status_code=404, detail="College not found")
    doc.pop("_id", None)
    return doc


@api_router.delete("/admin/colleges/{college_id}")
async def delete_college(college_id: str, user: dict = Depends(get_current_user)):
    result = await db.colleges.delete_one({"id": college_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="College not found")
    return {"message": "College deleted"}


@api_router.post("/admin/colleges/{college_id}/courses")
async def add_course(college_id: str, body: CourseCreate, user: dict = Depends(get_current_user)):
    college = await db.colleges.find_one({"id": college_id})
    if not college:
        raise HTTPException(status_code=404, detail="College not found")
    if not body.name.strip():
        raise HTTPException(status_code=422, detail="Course name is required")
    existing = {c.get("id") for c in (college.get("courses") or [])}
    candidate, i = slugify(body.name), 2
    while candidate in existing:
        candidate = f"{slugify(body.name)}-{i}"
        i += 1
    new_course = {"id": candidate, "name": body.name.strip(), "duration": body.duration, "seats": body.seats, "eligibility": body.eligibility, "active": body.active}
    await db.colleges.update_one({"id": college_id}, {"$push": {"courses": new_course}})
    return new_course


@api_router.patch("/admin/colleges/{college_id}/courses/{course_id}")
async def update_course(college_id: str, course_id: str, body: CourseUpdate, user: dict = Depends(get_current_user)):
    payload = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not payload:
        raise HTTPException(status_code=422, detail="Nothing to update")
    set_fields = {f"courses.$.{k}": v for k, v in payload.items()}
    result = await db.colleges.update_one({"id": college_id, "courses.id": course_id}, {"$set": set_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    doc = await db.colleges.find_one({"id": college_id})
    doc.pop("_id", None)
    return doc


@api_router.delete("/admin/colleges/{college_id}/courses/{course_id}")
async def delete_course(college_id: str, course_id: str, user: dict = Depends(get_current_user)):
    result = await db.colleges.update_one({"id": college_id}, {"$pull": {"courses": {"id": course_id}}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    return {"message": "Course deleted"}


SV_COLLEGES_SEED = [
    {
        "id": "svcon", "name": "S V College of Nursing", "campus": "Mallathahalli, Bengaluru", "domain": "nursing", "active": True,
        "courses": [
            {"id": "bsc-nursing", "name": "B.Sc. Nursing", "duration": "4 Years", "seats": 60, "eligibility": "PUC (Science) / 10+2", "active": True},
            {"id": "msc-nursing", "name": "M.Sc. Nursing", "duration": "2 Years", "seats": 25, "eligibility": "B.Sc Nursing graduates", "active": True},
            {"id": "gnm-dgnm", "name": "GNM (DGNM)", "duration": "2 Years", "seats": 50, "eligibility": "10+2 / PUC", "active": True},
        ],
    },
    {
        "id": "drvson", "name": "D R Vijayakumari School of Nursing", "campus": "Mallathahalli, Bengaluru", "domain": "nursing", "active": True,
        "courses": [
            {"id": "dgnm", "name": "DGNM (GNM)", "duration": "2 Years", "seats": 40, "eligibility": "10+2 / PUC", "active": True},
        ],
    },
]


async def seed_colleges_if_empty():
    try:
        if await db.colleges.count_documents({}) > 0:
            return
        docs = [dict(c) for c in SV_COLLEGES_SEED]
        await db.colleges.insert_many(docs)
        logger.info(f"Seeded {len(docs)} colleges into MongoDB")
    except Exception:
        logger.exception("Could not seed colleges")


# ---------------- Bulk import (CSV rows) ----------------

class BulkImportBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    students: List[Dict[str, Any]]


@api_router.post("/admin/students/bulk-import")
async def bulk_import_students(body: BulkImportBody, user: dict = Depends(get_current_user)):
    if not body.students:
        raise HTTPException(status_code=422, detail="No student rows supplied")
    colleges_docs = await db.colleges.find({}).to_list(500)
    college_index = {c["id"]: c for c in colleges_docs}

    results = []
    for idx, raw in enumerate(body.students):
        row_num = idx + 1
        row = {k: ("" if v is None else str(v).strip()) for k, v in raw.items()}
        errors = []
        for req in ("full_name", "mobile", "email", "collegeId", "courseId"):
            if not row.get(req, ""):
                errors.append(f"{req} is required")
        college = college_index.get(row.get("collegeId", ""))
        if row.get("collegeId") and not college:
            errors.append(f'Unknown collegeId "{row.get("collegeId")}"')
        course = None
        if college:
            course = next((c for c in (college.get("courses") or []) if c.get("id") == row.get("courseId")), None)
            if row.get("courseId") and not course:
                errors.append(f'Unknown courseId "{row.get("courseId")}" for {college.get("name")}')
        email = row.get("email", "")
        if email and "@" not in email:
            errors.append("email looks invalid")
        mobile = "".join(ch for ch in row.get("mobile", "") if ch.isdigit())
        if mobile and len(mobile) < 10:
            errors.append("mobile should be 10 digits")
        if errors:
            results.append({"row": row_num, "ok": False, "errors": errors, "input": raw})
            continue

        fee_years = {}
        for k in ("year1", "year2", "year3", "year4"):
            v = row.get(k, "")
            if v:
                try:
                    fee_years[k] = float(v)
                except (TypeError, ValueError):
                    pass
        scholarship = 0.0
        if row.get("scholarship_amount"):
            try:
                scholarship = float(row["scholarship_amount"])
            except (TypeError, ValueError):
                pass

        now = datetime.now(timezone.utc).isoformat()
        doc = {
            "_id": str(ObjectId()),
            "application_number": f"SVN-{datetime.now(timezone.utc).strftime('%Y%m')}-{uuid.uuid4().hex[:4].upper()}",
            "status": "approved",
            "admin_notes": row.get("admin_notes") or "Bulk imported",
            "created_at": now,
            "full_name": row.get("full_name", ""),
            "mobile": mobile,
            "email": email,
            "dob": row.get("dob", ""),
            "gender": row.get("gender", ""),
            "nationality": "Indian",
            "photo": "",
            "programme": (course or {}).get("name", ""),
            "college": (college or {}).get("name", ""),
            "hostel": "No",
            "transport": "No",
            "address_line1": "", "address_line2": "",
            "city": row.get("city", ""), "state": row.get("state", ""), "pincode": row.get("pincode", ""),
            "guardian_name": row.get("guardian_name", ""),
            "guardian_mobile": "".join(ch for ch in row.get("guardian_mobile", "") if ch.isdigit()),
            "guardian_email": "", "guardian_occupation": "",
            "emergency_name": "", "emergency_mobile": "",
            "b10_board": "", "b10_year": "", "b10_pct": row.get("b10_pct", ""), "b10_school": "",
            "b12_board": "", "b12_year": "", "b12_stream": "", "b12_pct": row.get("b12_pct", ""), "b12_school": "",
            "other_qualification": "", "marksheet10": "", "marksheet12": "",
            "payment_mode": "", "payment_reference": "", "payment_receiver": "", "referral_source": "Bulk Import", "payment_remarks": "",
            "declaration_text": "", "agree_accurate": True, "agree_communication": False,
            "signature": row.get("full_name", ""),
            "fee_years": fee_years,
            "fee_total": max(0.0, sum(fee_years.values()) - scholarship),
            "scholarship_amount": scholarship,
            "payments": [],
            "schedules": [],
        }
        try:
            await db.applications.insert_one(doc)
            results.append({"row": row_num, "ok": True, "application_number": doc["application_number"], "full_name": doc["full_name"]})
        except Exception as e:
            results.append({"row": row_num, "ok": False, "errors": [f"Insert failed: {str(e)[:80]}"], "input": raw})

    return {
        "created": sum(1 for r in results if r["ok"]),
        "failed": sum(1 for r in results if not r["ok"]),
        "total": len(results),
        "results": results,
    }


# ---------------- Dashboard stats (charts feed) ----------------

@api_router.get("/admin/stats")
async def admin_stats(user: dict = Depends(get_current_user)):
    total = await db.applications.count_documents({})

    by_status = {}
    async for row in db.applications.aggregate([{"$group": {"_id": "$status", "count": {"$sum": 1}}}]):
        by_status[row["_id"] or "unknown"] = row["count"]

    by_college = []
    async for row in db.applications.aggregate([
        {"$group": {"_id": "$college", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]):
        by_college.append({"college": row["_id"] or "Unknown", "count": row["count"]})

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today = await db.applications.count_documents({"created_at": {"$gte": today_start}})

    now_dt = datetime.now(timezone.utc)
    months = []
    for i in range(5, -1, -1):
        year, month = now_dt.year, now_dt.month - i
        while month <= 0:
            month += 12
            year -= 1
        months.append(f"{year:04d}-{month:02d}")

    revenue = {m: 0.0 for m in months}
    apps_by_month = {m: 0 for m in months}
    async for doc in db.applications.find({}, {"payments": 1, "created_at": 1}):
        sub = (doc.get("created_at") or "")[:7]
        if sub in apps_by_month:
            apps_by_month[sub] += 1
        for p in (doc.get("payments") or []):
            key = (p.get("date") or (p.get("created_at") or ""))[:7]
            if key in revenue:
                try:
                    revenue[key] += float(p.get("amount") or 0)
                except (TypeError, ValueError):
                    pass

    by_month = [
        {"key": m, "label": datetime.strptime(m, "%Y-%m").strftime("%b %Y"), "amount": round(revenue[m], 2)}
        for m in months
    ]
    apps_month_series = [
        {"key": m, "label": datetime.strptime(m, "%Y-%m").strftime("%b"), "count": apps_by_month[m]}
        for m in months
    ]

    return {
        "total": total,
        "today": today,
        "byStatus": by_status,
        "byCollege": by_college,
        "byMonth": by_month,
        "appsByMonth": apps_month_series,
        "totalCollected": round(sum(revenue.values()), 2),
    }


# ---------------- Media library (admin-uploaded photos/videos) ----------------

MAX_MEDIA_BYTES = 9 * 1024 * 1024  # ~9MB decoded


class MediaUpload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str = ""
    mime: str = ""
    data: str  # base64 (optionally a data: URL)


@api_router.post("/admin/media")
async def upload_media(input: MediaUpload, user: dict = Depends(get_current_user)):
    payload = input.data.split(",", 1)[1] if input.data.startswith("data:") else input.data
    try:
        binary = base64.b64decode(payload, validate=True)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid file data")
    if len(binary) > MAX_MEDIA_BYTES:
        raise HTTPException(status_code=422, detail="File too large — photos up to 5 MB please (videos: use the video upload)")
    mime = (input.mime or "application/octet-stream").split(";")[0].strip()
    file_id = await fs_bucket.upload_from_stream(input.name or "upload", binary, metadata={"mime": mime, "size": len(binary)})
    return {"id": str(file_id), "url": f"/api/media/{file_id}", "size": len(binary), "mime": mime}


@api_router.post("/admin/media/raw")
async def upload_media_raw(request: Request, name: str = "video", mime: str = "video/mp4", user: dict = Depends(get_current_user)):
    """Large video uploads — raw binary body, stored in GridFS (chunked, no 16MB doc limit)."""
    binary = await request.body()
    if len(binary) > MAX_VIDEO_BYTES:
        raise HTTPException(status_code=422, detail="Video is larger than 40 MB. For longer videos use the YouTube / direct-link option.")
    if not binary:
        raise HTTPException(status_code=422, detail="Empty upload")
    mime = (mime or "video/mp4").split(";")[0].strip()
    file_id = await fs_bucket.upload_from_stream(name, binary, metadata={"mime": mime, "size": len(binary)})
    return {"id": str(file_id), "url": f"/api/media/{file_id}", "size": len(binary), "mime": mime}


async def _get_media(oid: ObjectId):
    """GridFS first, legacy base64 collection second."""
    try:
        grid_out = await fs_bucket.open_download_stream(oid)
        data = await grid_out.read()
        mime = ((grid_out.metadata or {}).get("mime")) or "application/octet-stream"
        return data, mime
    except Exception:
        doc = await db.media.find_one({"_id": oid})
        if doc:
            return base64.b64decode(doc["data"]), doc.get("mime", "application/octet-stream")
        return None, None


@api_router.get("/media/{media_id}")
async def serve_media(media_id: str, request: Request):
    try:
        oid = ObjectId(media_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Media not found")
    binary, mime = await _get_media(oid)
    if binary is None:
        raise HTTPException(status_code=404, detail="Media not found")
    range_header = request.headers.get("range")
    if range_header and range_header.startswith("bytes="):
        try:
            start_s, end_s = range_header.split("=", 1)[1].split("-", 1)
            start = int(start_s)
            end = int(end_s) if end_s else len(binary) - 1
            end = min(end, len(binary) - 1)
            chunk = binary[start : end + 1]
            return Response(
                content=chunk,
                status_code=206,
                media_type=mime,
                headers={
                    "Content-Range": f"bytes {start}-{end}/{len(binary)}",
                    "Accept-Ranges": "bytes",
                    "Cache-Control": "public, max-age=31536000, immutable",
                },
            )
        except (ValueError, IndexError):
            pass
    return Response(
        content=binary,
        media_type=mime,
        headers={"Cache-Control": "public, max-age=31536000, immutable", "Accept-Ranges": "bytes"},
    )


@api_router.delete("/admin/media/{media_id}")
async def delete_media(media_id: str, user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(media_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Media not found")
    try:
        await fs_bucket.delete(oid)
        return {"message": "Media deleted"}
    except Exception:
        result = await db.media.delete_one({"_id": oid})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Media not found")
        return {"message": "Media deleted"}


# ---------------- Editable site content (CMS) ----------------

DEFAULT_CONTENT = {
    "contact": {
        "name": "S V GROUP OF INSTITUTIONS",
        "tagline": "Excellence in Health Education · Bengaluru",
        "email": "admissions@svinstitutions.co.in",
        "phone": "+91 90378 34632",
        "address": "80 Feet Ring Road, Near Bangalore University, Mallathahalli Bus Stop, Bangalore - 560056",
        "instagram": "svgoiofficial",
    },
    "hero": {
        "headline_lines": ["A Culture of", "Excellence", "in Learning"],
        "sub": "S V College of Nursing is renowned across India for its excellence in nursing education — affiliated to Rajiv Gandhi University of Health Sciences and recognised by the Indian Nursing Council & Karnataka State Nursing Council.",
        "video_kind": "upload",
        "video_link": "",
        "video_sound": "muted",
        "video_media_id": None,
        "poster_media_id": None,
        "poster_fallback": "https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?q=80&w=1600&auto=format&fit=crop",
        "stats": [
            {"n": "135", "l": "Sanctioned Seats"},
            {"n": "03", "l": "Nursing Programs"},
            {"n": "02", "l": "Institutions"},
        ],
    },
    "gallery": {
        "photos": [
            {"id": "g1", "url": "https://images.pexels.com/photos/35645510/pexels-photo-35645510.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2", "caption": "Skill lab — supervised phlebotomy practice", "tag": "Labs"},
            {"id": "g2", "url": "https://images.unsplash.com/photo-1517120026326-d87759a7b63b?q=80&w=1200&auto=format&fit=crop", "caption": "Hospital postings — neonatal intensive care", "tag": "Hospital Training"},
            {"id": "g3", "url": "https://images.unsplash.com/photo-1709805619372-40de3f158e83?q=80&w=1200&auto=format&fit=crop", "caption": "Campus hostel accommodation", "tag": "Hostels"},
            {"id": "g4", "url": "https://images.pexels.com/photos/35645506/pexels-photo-35645506.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2", "caption": "Clinical procedures under faculty supervision", "tag": "Labs"},
            {"id": "g5", "url": "https://images.unsplash.com/photo-1762512346988-045f4d5ad2b3?q=80&w=1200&auto=format&fit=crop", "caption": "Digital health library & study hall", "tag": "Library"},
            {"id": "g6", "url": "https://images.unsplash.com/photo-1586534738560-438efdf1d205?q=80&w=1200&auto=format&fit=crop", "caption": "Ward rounds and hands-on hospital exposure", "tag": "Hospital Training"},
        ],
    },
    "facilities": {
        "hostel_url": "https://images.unsplash.com/photo-1769147555720-71fc71bfc216?q=80&w=1600&auto=format&fit=crop",
        "hostel_media_id": None,
    },
    "faq": {
        "items": [
            {"q": "Which nursing courses does S V College of Nursing offer?", "a": "We offer three programs — B.Sc Nursing (4 years), M.Sc Nursing (2 years) and GNM — General Nursing & Midwifery (3 years) — with a combined intake of 135 sanctioned seats, all under S V Group of Institutions, Bengaluru."},
            {"q": "Is the college recognised and affiliated?", "a": "Yes. S V College of Nursing is affiliated to Rajiv Gandhi University of Health Sciences (RGUHS), Bengaluru, and recognised by the Indian Nursing Council (INC) and Karnataka State Nursing Council (KSNC). Official approval documents are displayed on this website."},
            {"q": "How can I apply for admission?", "a": "Apply online using the Apply Now form on this website — it takes about 10 minutes and saves your progress automatically. You can also call +91 90378 34632 or visit the campus at Mallathahalli, Bengaluru."},
            {"q": "Does the college provide hostel facilities?", "a": "Yes — separate, secure hostels for female and male students with 24/7 security, resident wardens, mess and study halls on campus."},
            {"q": "Where exactly is the campus located?", "a": "80 Feet Ring Road, beside Bangalore University, at Mallathahalli Bus Stop, Bengaluru – 560056. The campus is well connected by BMTC buses to all parts of the city."},
            {"q": "What is the eligibility for B.Sc Nursing?", "a": "Candidates should have passed 10+2 (PUC or equivalent) with Physics, Chemistry, Biology and English, and be 17 years of age or older. Our admissions team will walk you through the exact RGUHS criteria and documents needed."},
        ],
    },
}


def _youtube_embed(link: str) -> str:
    """Parse a YouTube URL (watch / youtu.be / shorts / embed / raw id) into a cinematic embed URL."""
    link = (link or "").strip()
    if not link:
        return ""
    m = re.search(r"(?:youtube\.com/(?:watch\?.*v=|embed/|shorts/)|youtu\.be/)([A-Za-z0-9_-]{6,})", link)
    vid = m.group(1) if m else (link if re.fullmatch(r"[A-Za-z0-9_-]{11}", link) else "")
    if not vid:
        return ""
    return (
        f"https://www.youtube-nocookie.com/embed/{vid}"
        "?autoplay=1&mute=1&loop=1&playlist=" + vid + "&controls=0&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3&disablekb=1&enablejsapi=1"
    )


def _media_url(media_id: str | None, fallback: str | None) -> str | None:
    if media_id:
        return f"/api/media/{media_id}"
    return fallback


class ContentUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    contact: Optional[Dict[str, Any]] = None
    hero: Optional[Dict[str, Any]] = None
    gallery: Optional[Dict[str, Any]] = None
    facilities: Optional[Dict[str, Any]] = None
    faq: Optional[Dict[str, Any]] = None


async def get_site_content() -> dict:
    doc = await db.site_content.find_one({"_id": "site"})
    base = json.loads(json.dumps(DEFAULT_CONTENT))  # deep copy
    if doc:
        for section in ("contact", "hero", "gallery", "facilities", "faq"):
            if isinstance(doc.get(section), dict):
                base[section].update(doc[section])
    hero = base["hero"]
    hero["video_url"] = _media_url(hero.get("video_media_id"), "/hero.mp4")
    hero["poster_url"] = _media_url(hero.get("poster_media_id"), hero.get("poster_fallback"))
    if hero.get("video_kind") == "youtube":
        hero["video_embed"] = _youtube_embed(hero.get("video_link", ""))
    else:
        hero["video_embed"] = ""
    facilities = base["facilities"]
    facilities["hostel_img"] = _media_url(facilities.get("hostel_media_id"), facilities.get("hostel_url"))
    for photo in base["gallery"].get("photos", []):
        photo["img"] = _media_url(photo.get("media_id"), photo.get("url"))
    return base


@api_router.get("/content")
async def read_content():
    return await get_site_content()


@api_router.put("/admin/content")
async def write_content(input: ContentUpdate, user: dict = Depends(get_current_user)):
    set_fields = {}
    for section in ("contact", "hero", "gallery", "facilities", "faq"):
        value = getattr(input, section)
        if value is not None:
            if not isinstance(value, dict):
                raise HTTPException(status_code=422, detail=f"Invalid {section} payload")
            for k, v in value.items():
                set_fields[f"{section}.{k}"] = v  # merge per key — partial saves keep siblings
    if not set_fields:
        raise HTTPException(status_code=422, detail="Nothing to update")
    await db.site_content.update_one({"_id": "site"}, {"$set": set_fields}, upsert=True)
    return await get_site_content()


# ---------------- Instagram live feed (Business Discovery, server-side token) ----------------

IG_POST_FIELDS = "id,media_url,thumbnail_url,caption,permalink,timestamp,media_type"


def _ig_graph_get(url: str, params: dict) -> dict:
    import httpx
    r = httpx.get(url, params=params, timeout=15)
    return r


def _parse_ig_media(payload: dict) -> list:
    media = (payload.get("business_discovery") or {}).get("media") or {}
    posts = []
    for p in (media.get("data") or [])[:12]:
        if not p.get("permalink"):
            continue
        posts.append({
            "id": p.get("id"),
            "image": p.get("thumbnail_url") or p.get("media_url") or "",
            "caption": (p.get("caption") or "")[:220],
            "permalink": p.get("permalink"),
            "timestamp": p.get("timestamp") or "",
            "media_type": p.get("media_type") or "IMAGE",
        })
    return posts


def _sync_fetch_instagram(token: str, username: str) -> list:
    fields = f"business_discovery.username({username}){{media.limit(12){{{IG_POST_FIELDS}}}}}"
    # Route 1: Instagram Login token (graph.instagram.com/me)
    r = _ig_graph_get("https://graph.instagram.com/me", {"fields": fields, "access_token": token})
    if r.status_code == 200:
        return _parse_ig_media(r.json())
    # Route 1b: Instagram Login token — resolve the numeric IG user id, then discover on it
    r_id = _ig_graph_get("https://graph.instagram.com/me", {"fields": "user_id,username", "access_token": token})
    if r_id.status_code == 200 and (r_id.json() or {}).get("user_id"):
        r1b = _ig_graph_get(
            f"https://graph.instagram.com/{r_id.json()['user_id']}",
            {"fields": fields, "access_token": token},
        )
        if r1b.status_code == 200:
            return _parse_ig_media(r1b.json())
    # Route 2: Facebook Login token — find the connected IG business account, then discover
    r2 = _ig_graph_get("https://graph.facebook.com/v21.0/me/accounts", {"fields": "id,name,instagram_business_account{id,username}", "access_token": token})
    if r2.status_code == 200:
        for page in (r2.json().get("data") or []):
            ig = (page.get("instagram_business_account") or {})
            ig_id = ig.get("id")
            if ig_id:
                r3 = _ig_graph_get(f"https://graph.facebook.com/v21.0/{ig_id}", {"fields": fields, "access_token": token})
                if r3.status_code == 200:
                    return _parse_ig_media(r3.json())
    detail = "Could not fetch the Instagram feed. Check the token, account type (must be Business/Creator) and page linkage."
    raise HTTPException(status_code=502, detail=detail)


class InstagramSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    token: str
    username: str = "svgoiofficial"
    app_id: str = ""
    app_secret: str = ""


def _exchange_to_long_lived(token: str, app_id: str, app_secret: str) -> str:
    r = _ig_graph_get(
        "https://graph.facebook.com/v21.0/oauth/access_token",
        {"client_id": app_id, "client_secret": app_secret, "grant_type": "fb_exchange_token", "fb_exchange_token": token},
    )
    if r.status_code == 200 and r.json().get("access_token"):
        return r.json()["access_token"]
    return token  # fall back to the pasted token if the exchange is rejected


def _exchange_ig_token(token: str, app_secret: str) -> str:
    """Instagram Login flow: 1-hour token -> 60-day token via ig_exchange_token (needs only the app secret)."""
    r = _ig_graph_get(
        "https://graph.instagram.com/access_token",
        {"grant_type": "ig_exchange_token", "client_secret": app_secret, "access_token": token},
    )
    if r.status_code == 200 and r.json().get("access_token"):
        return r.json()["access_token"]
    return token  # fall back to the pasted token if the exchange is rejected


@api_router.post("/admin/instagram")
async def connect_instagram(input: InstagramSettings, user: dict = Depends(get_current_user)):
    username = input.username.strip().lstrip("@")
    if not input.token.strip():
        raise HTTPException(status_code=422, detail="Access token is required")
    token = input.token.strip()
    if input.app_secret.strip() and input.app_id.strip():
        token = _exchange_to_long_lived(token, input.app_id.strip(), input.app_secret.strip())
    elif input.app_secret.strip():
        token = _exchange_ig_token(token, input.app_secret.strip())
    import asyncio
    loop = asyncio.get_event_loop()
    try:
        posts = await loop.run_in_executor(None, _sync_fetch_instagram, token, username)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=502, detail="Could not reach Instagram. Please try again.")
    await db.instagram.update_one(
        {"_id": "ig"},
        {"$set": {"token": token, "username": username, "last_sync": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    for p in posts:
        await db.ig_posts.update_one({"id": p["id"]}, {"$set": p}, upsert=True)
    return {"connected": True, "username": username, "posts": len(posts)}


@api_router.get("/instagram/posts")
async def instagram_posts_public():
    """Cached live posts — refreshed lazily (max every 15 min) when a token is connected."""
    settings = await db.instagram.find_one({"_id": "ig"})
    if settings and settings.get("token"):
        last = settings.get("last_sync")
        stale = True
        try:
            if last:
                stale = (datetime.now(timezone.utc) - datetime.fromisoformat(last)).total_seconds() > 900
        except (ValueError, TypeError):
            stale = True
        if stale:
            try:
                import asyncio
                loop = asyncio.get_event_loop()
                posts = await loop.run_in_executor(None, _sync_fetch_instagram, settings["token"], settings.get("username", "svgoiofficial"))
                for p in posts:
                    await db.ig_posts.update_one({"id": p["id"]}, {"$set": p}, upsert=True)
                await db.instagram.update_one({"_id": "ig"}, {"$set": {"last_sync": datetime.now(timezone.utc).isoformat()}})
            except Exception:
                pass  # serve cache on any Meta hiccup
    docs = await db.ig_posts.find({}).sort("timestamp", -1).to_list(12)
    for d in docs:
        d.pop("_id", None)
    return {"connected": bool(settings and settings.get("token")), "posts": docs}


@api_router.delete("/admin/instagram")
async def disconnect_instagram(user: dict = Depends(get_current_user)):
    await db.instagram.delete_one({"_id": "ig"})
    return {"connected": False}


# ---------------- Application PDF (branded, admin + public copy) ----------------

def _build_application_pdf(app_doc: dict, generated_at: str, contact: dict | None = None) -> bytes:
    W, H = A4
    M = 46
    MAROON, INK = HexColor(0x6E0A28), HexColor(0x22090F)
    GREY, LINE = HexColor(0x6B7280), HexColor(0xE5E7EB)
    FOOTBG = HexColor(0xF3F4F6)
    BRAND_NAME = (contact or {}).get("name") or INSTITUTE_NAME
    BRAND_TAGLINE = (contact or {}).get("tagline") or INSTITUTE_TAGLINE
    BRAND_ADDRESS = (contact or {}).get("address") or INSTITUTE_ADDRESS
    BRAND_EMAIL = (contact or {}).get("email") or INSTITUTE_EMAIL
    BRAND_PHONE = (contact or {}).get("phone") or INSTITUTE_PHONE

    buf = BytesIO()
    c = pdf_canvas.Canvas(buf, pagesize=A4)

    def header(title):
        if LOGO_PATH.exists():
            c.drawImage(str(LOGO_PATH), M, H - 112, width=62, height=62, mask="auto", preserveAspectRatio=True)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 17)
        c.drawString(M + 76, H - 68, BRAND_NAME)
        c.setFillColor(GREY)
        c.setFont("Helvetica", 9)
        c.drawString(M + 76, H - 83, BRAND_TAGLINE)
        c.setFont("Helvetica", 8)
        c.drawString(M + 76, H - 96, BRAND_ADDRESS)
        c.setFont("Helvetica", 9)
        c.drawRightString(W - M, H - 68, BRAND_EMAIL)
        c.drawRightString(W - M, H - 81, BRAND_PHONE)
        c.setFillColor(MAROON)
        c.rect(0, H - 150, W, 38, stroke=0, fill=1)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 13.5)
        c.drawCentredString(W / 2, H - 138, title)

    def new_page():
        footer()
        c.showPage()
        header("APPLICATION FORM (contd.)")
        return H - 180

    def footer():
        c.setFillColor(FOOTBG)
        c.rect(0, 0, W, 36, stroke=0, fill=1)
        c.setFillColor(GREY)
        c.setFont("Helvetica", 8)
        c.drawCentredString(W / 2, 21, "This is a system-generated document. Please retain for your records.")
        c.drawCentredString(W / 2, 10, f"Generated on {generated_at}")

    header("APPLICATION FORM")
    y = H - 186

    photo = app_doc.get("photo") or ""
    if photo.startswith("data:image"):
        try:
            import base64
            img = ImageReader(BytesIO(base64.b64decode(photo.split(",", 1)[1])))
            c.drawImage(img, W - M - 92, y - 68, width=92, height=92, mask="auto", preserveAspectRatio=True)
        except Exception:
            pass

    c.setFillColor(GREY)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(M, y, "APPLICATION NUMBER")
    c.setFillColor(MAROON)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(M, y - 20, app_doc.get("application_number") or "—")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(M, y - 42, app_doc.get("full_name") or "—")
    c.setFillColor(GREY)
    c.setFont("Helvetica", 9)
    c.drawString(M, y - 57, f"Submitted on {_fmt_date_long(app_doc.get('created_at') or '')} · Status: {(app_doc.get('status') or 'submitted').title()}")
    y -= 84

    def section(title):
        nonlocal y
        if y < 150:
            y = new_page()
        y -= 10
        c.setFillColor(MAROON)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(M, y, title.upper())
        y -= 6
        c.setStrokeColor(LINE)
        c.setLineWidth(0.8)
        c.line(M, y, W - M, y)
        y -= 16

    def rows(pairs):
        nonlocal y
        col_w = (W - 2 * M) / 2
        col = 0
        for label, value in pairs:
            if y < 110:
                y = new_page()
            x = M if col == 0 else M + col_w
            c.setFillColor(GREY)
            c.setFont("Helvetica-Bold", 7)
            c.drawString(x, y, label.upper())
            c.setFillColor(INK)
            c.setFont("Helvetica", 9.5)
            c.drawString(x, y - 12, str(value if value not in ("", None) else "—"))
            col += 1
            if col == 2:
                col = 0
                y -= 34
        if col == 1:
            y -= 34

    section("Basic Information")
    rows([
        ("Mobile", app_doc.get("mobile")), ("Email", app_doc.get("email")),
        ("Date of Birth", app_doc.get("dob")), ("Gender", app_doc.get("gender")),
        ("Aadhaar", app_doc.get("aadhaar")), ("Nationality", app_doc.get("nationality")),
        ("Religion", app_doc.get("religion")), ("Caste", app_doc.get("caste")),
        ("Blood Group", app_doc.get("blood_group")),
    ])
    section("Course Applied")
    rows([
        ("Programme", app_doc.get("programme")), ("College", app_doc.get("college")),
        ("Hostel Required", app_doc.get("hostel")), ("Transport Required", app_doc.get("transport")),
    ])
    section("Communication & Guardian")
    rows([
        ("Address", ", ".join(filter(None, [app_doc.get("address_line1"), app_doc.get("address_line2")]))),
        ("City", app_doc.get("city")),
        ("State", app_doc.get("state")), ("Pincode", app_doc.get("pincode")),
        ("Guardian", app_doc.get("guardian_name")), ("Guardian Mobile", app_doc.get("guardian_mobile")),
        ("Guardian Email", app_doc.get("guardian_email")), ("Guardian Occupation", app_doc.get("guardian_occupation")),
        ("Emergency Contact", " ".join(filter(None, [app_doc.get("emergency_name"), app_doc.get("emergency_mobile")]))),
    ])
    section("Academic Record")
    rows([
        ("10th Board / Year", " / ".join(filter(None, [app_doc.get("b10_board"), app_doc.get("b10_year")]))),
        ("10th Percentage", app_doc.get("b10_pct")),
        ("10th School", app_doc.get("b10_school")),
        ("12th Board / Year", " / ".join(filter(None, [app_doc.get("b12_board"), app_doc.get("b12_year")]))),
        ("12th Stream / %", " / ".join(filter(None, [app_doc.get("b12_stream"), app_doc.get("b12_pct")]))),
        ("12th School", app_doc.get("b12_school")),
        ("Other Qualifications", app_doc.get("other_qualification")),
    ])
    section("Payment & Reference")
    rows([
        ("Payment Mode", app_doc.get("payment_mode")), ("Reference", app_doc.get("payment_reference")),
        ("Paid To", app_doc.get("payment_receiver")), ("Referral Source", app_doc.get("referral_source")),
        ("Remarks", app_doc.get("payment_remarks")),
    ])
    section("Declaration")
    rows([
        ("Confirmed Accurate", "Yes" if app_doc.get("agree_accurate") else "No"),
        ("Consent to Communication", "Yes" if app_doc.get("agree_communication") else "No"),
        ("Signature", app_doc.get("signature")),
    ])

    if y < 150:
        y = new_page()
    c.setStrokeColor(HexColor(0x9CA3AF))
    c.setLineWidth(0.8)
    c.line(W - M - 190, y - 24, W - M, y - 24)
    c.setFillColor(GREY)
    c.setFont("Helvetica", 8.5)
    c.drawCentredString(W - M - 95, y - 37, "Authorised Signatory")
    footer()
    c.showPage()
    c.save()
    return buf.getvalue()


@api_router.get("/applications/copy/{application_number_copy}.pdf")
async def download_application_copy(application_number_copy: str):
    """Public branded copy of a submitted application (keyed by its unguessable number)."""
    application_number = application_number_copy[: -len(".pdf")] if application_number_copy.endswith(".pdf") else application_number_copy
    doc = await db.applications.find_one({"application_number": application_number.upper()})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    content = await get_site_content()
    pdf = _build_application_pdf(doc, _generated_stamp(), contact=content.get("contact"))
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Application-{doc.get("application_number")}.pdf"'},
    )


@api_router.get("/applications/{application_id}/application.pdf")
async def download_application_pdf(application_id: str, user: dict = Depends(get_current_user)):
    doc = await db.applications.find_one({"_id": application_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    content = await get_site_content()
    pdf = _build_application_pdf(doc, _generated_stamp(), contact=content.get("contact"))
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Application-{doc.get("application_number")}.pdf"'},
    )


@api_router.delete("/applications/{application_id}")
async def delete_application(application_id: str, user: dict = Depends(get_current_user)):
    result = await db.applications.delete_one({"_id": application_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"message": "Application deleted"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[o.strip() for o in os.environ.get('CORS_ORIGINS', '*').split(',') if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.colleges.create_index("id", unique=True)
    await seed_admin()
    await seed_colleges_if_empty()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
