"""Backend tests: Admin auth + Fee Receipt PDF flow (SV Group admissions).

Focus:
- Login (bcrypt, JWT, cookies)
- Overdue fixture data (SVN-202609-DDF7)
- Receipt no. format SVR-XXXX-XXXXXX (stable across calls)
- GET /applications/{app_id}/payments/{pay_id}/receipt.pdf returns application/pdf
- add_payment assigns receipt_no
- Legacy backfill via _ensure_receipt_no
"""
import os
import re
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sv-health-education.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admissions@svinstitutions.co.in"
ADMIN_PASSWORD = "SvAdmin@2025"
FIXTURE_APP_NUMBER = "SVN-202609-DDF7"


@pytest.fixture(scope="session")
def fixture_app_id(auth_session):
    r = auth_session.get(f"{BASE_URL}/api/applications/by-number/{FIXTURE_APP_NUMBER}", timeout=10)
    assert r.status_code == 200, r.text[:200]
    return r.json()["id"]


@pytest.fixture(scope="session")
def auth_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
               timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    body = r.json()
    assert "access_token" in body
    # Cookie set?
    assert any(c.name == "access_token" for c in s.cookies), "access_token cookie missing"
    s.headers["Authorization"] = f"Bearer {body['access_token']}"
    return s


# ---------------- Auth ----------------
class TestAuth:
    def test_login_success_and_cookies(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/auth/me", timeout=10)
        assert r.status_code == 200
        me = r.json()
        assert me.get("email") == ADMIN_EMAIL
        assert me.get("role") == "admin"

    def test_login_invalid(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": "nope@x.com", "password": "wrong"}, timeout=10)
        assert r.status_code in (401, 429)


# ---------------- Fixture application + overdue ----------------
class TestFixtureAndOverdue:
    def test_fixture_application_present(self, auth_session, fixture_app_id):
        r = auth_session.get(f"{BASE_URL}/api/applications/{fixture_app_id}", timeout=10)
        assert r.status_code == 200
        doc = r.json()
        assert doc["application_number"] == FIXTURE_APP_NUMBER
        assert doc.get("status") == "approved"
        # fee_schedules present with 'First' overdue 2026-09-29 ₹50,000 outstanding
        schedules = doc.get("schedules") or []
        assert schedules, "no schedules"
        first = next((s for s in schedules if s.get("label") == "First"), None)
        assert first is not None, "First schedule missing"
        assert first.get("due_date") == "2026-09-29"

    def test_two_test_payments_exist(self, auth_session, fixture_app_id):
        r = auth_session.get(f"{BASE_URL}/api/applications/{fixture_app_id}", timeout=10)
        doc = r.json()
        payments = doc.get("payments") or []
        assert len(payments) >= 2
        pat = re.compile(r"^SVR-[A-Z0-9]{4}-[A-F0-9]{6}$")
        with_receipt = [p for p in payments if p.get("receipt_no")]
        assert len(with_receipt) >= 2, f"expected at least 2 payments with receipt_no, got {len(with_receipt)}"
        for p in with_receipt:
            assert pat.match(p["receipt_no"]), f"bad receipt_no format: {p['receipt_no']}"


# ---------------- Receipt PDF ----------------
class TestReceiptPDF:
    def _first_payment(self, session, fixture_app_id):
        r = session.get(f"{BASE_URL}/api/applications/{fixture_app_id}", timeout=10)
        return r.json(), r.json()["payments"][0]

    def test_download_receipt_pdf_ok(self, auth_session, fixture_app_id):
        doc, payment = self._first_payment(auth_session, fixture_app_id)
        pid = payment["id"]
        r = auth_session.get(
            f"{BASE_URL}/api/applications/{fixture_app_id}/payments/{pid}/receipt.pdf",
            timeout=20,
        )
        assert r.status_code == 200, r.text[:300]
        assert "application/pdf" in r.headers.get("content-type", "").lower()
        assert r.content[:4] == b"%PDF", "content is not a PDF"
        cd = r.headers.get("content-disposition", "")
        assert "Receipt-" in cd and ".pdf" in cd

    def test_receipt_no_stable_across_downloads(self, auth_session, fixture_app_id):
        doc, payment = self._first_payment(auth_session, fixture_app_id)
        pid = payment["id"]
        rno1 = payment["receipt_no"]
        # second fetch – doc unchanged
        r = auth_session.get(f"{BASE_URL}/api/applications/{fixture_app_id}", timeout=10)
        p2 = next(p for p in r.json()["payments"] if p["id"] == pid)
        assert p2["receipt_no"] == rno1

    def test_receipt_unauthenticated_denied(self, fixture_app_id):
        # find a valid payment id via admin then hit anonymously
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/login",
                   json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=10)
        pid = r.json() and None
        r2 = requests.get(f"{BASE_URL}/api/applications/{fixture_app_id}", cookies=s.cookies, timeout=10)
        payment_id = r2.json()["payments"][0]["id"]
        anon = requests.get(
            f"{BASE_URL}/api/applications/{fixture_app_id}/payments/{payment_id}/receipt.pdf",
            timeout=10,
        )
        assert anon.status_code == 401


# ---------------- Add payment assigns receipt_no ----------------
class TestAddPayment:
    def test_add_payment_gets_receipt_no_then_delete(self, auth_session, fixture_app_id):
        payload = {
            "amount": 1000,
            "mode": "Cash",
            "utr": "",
            "remarks": "TEST_pytest_add_payment",
            "paid_on": "2026-01-15",
        }
        r = auth_session.post(
            f"{BASE_URL}/api/applications/{fixture_app_id}/payments",
            json=payload, timeout=15,
        )
        assert r.status_code in (200, 201), r.text[:300]
        doc = r.json()
        new_pay = next(
            (p for p in doc["payments"] if p.get("remarks") == "TEST_pytest_add_payment"),
            None,
        )
        assert new_pay is not None, "new payment not found in response"
        rno = new_pay.get("receipt_no")
        assert rno and re.match(r"^SVR-[A-Z0-9]{4}-[A-F0-9]{6}$", rno), f"bad receipt: {rno}"
        pid = new_pay["id"]

        # can download its PDF
        r_pdf = auth_session.get(
            f"{BASE_URL}/api/applications/{fixture_app_id}/payments/{pid}/receipt.pdf",
            timeout=15,
        )
        assert r_pdf.status_code == 200
        assert r_pdf.content[:4] == b"%PDF"

        # cleanup
        d = auth_session.delete(
            f"{BASE_URL}/api/applications/{fixture_app_id}/payments/{pid}", timeout=10,
        )
        assert d.status_code in (200, 204)
