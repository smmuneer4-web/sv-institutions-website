from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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


@api_router.get("/enquiries", response_model=List[Enquiry])
async def list_enquiries():
    docs = await db.enquiries.find().sort("created_at", -1).to_list(1000)
    return [Enquiry.from_mongo(d) for d in docs]


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
    return {"id": str(user["_id"]), "email": user["email"], "name": user.get("name", "Admin"), "role": user.get("role", "admin")}


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


@api_router.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
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
        return {"id": str(user["_id"]), "email": user["email"], "name": user.get("name", "Admin"), "role": user.get("role", "admin")}
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


# ---------------- Applications (full admission application portal) ----------------

VALID_STATUSES = ["submitted", "shortlist", "approved", "rejected"]


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

    payment_mode: str = ""
    payment_reference: str = ""
    payment_receiver: str = ""
    referral_source: str = ""
    payment_remarks: str = ""

    declaration_text: str = ""
    agree_accurate: bool = False
    agree_communication: bool = False
    signature: str = ""


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
    if not updates:
        raise HTTPException(status_code=422, detail="Nothing to update")
    doc = await db.applications.find_one_and_update(
        {"_id": application_id}, {"$set": updates}, return_document=ReturnDocument.AFTER
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    return Application.from_mongo(doc)


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
    await seed_admin()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
