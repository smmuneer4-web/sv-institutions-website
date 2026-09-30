"""Backend tests for S V Group new features (iteration 2).

Covers:
- Receipt PDF template details (A5 landscape, key strings)
- Public track endpoint + public application copy PDF
- Colleges (public + admin) CRUD + course CRUD + seed fixtures intact
- Bulk import validation + create + cleanup
- Admin stats endpoint fields (charts feed)
- Application PDF (admin) endpoint
- Payment date/fee_type/receiver persistence + delete
- Fee-years scholarship_amount computation
"""
import io
import os
import re
import pytest
import requests

try:
    from pypdf import PdfReader  # type: ignore
except Exception:  # pragma: no cover
    from PyPDF2 import PdfReader  # type: ignore

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL missing"
ADMIN_EMAIL = "admissions@svinstitutions.co.in"
ADMIN_PASSWORD = "SvAdmin@2025"
FIXTURE_APP_NUMBER = "SVN-202609-DDF7"


# ------------- Fixtures -------------
@pytest.fixture(scope="module")
def sess():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text[:200]
    s.headers["Authorization"] = f"Bearer {r.json()['access_token']}"
    return s


@pytest.fixture(scope="module")
def app_id(sess):
    r = sess.get(f"{BASE_URL}/api/applications/by-number/{FIXTURE_APP_NUMBER}", timeout=10)
    assert r.status_code == 200
    return r.json()["id"]


# ------------- Receipt PDF template -------------
class TestReceiptTemplate:
    def test_receipt_pdf_a5_landscape_and_content(self, sess, app_id):
        r = sess.get(f"{BASE_URL}/api/applications/{app_id}", timeout=10)
        pay = next((p for p in r.json()["payments"] if float(p.get("amount") or 0) == 50000), None) \
              or r.json()["payments"][0]
        pid = pay["id"]
        pdf = sess.get(f"{BASE_URL}/api/applications/{app_id}/payments/{pid}/receipt.pdf", timeout=20)
        assert pdf.status_code == 200
        assert "application/pdf" in pdf.headers.get("content-type", "")
        content = pdf.content
        assert content[:4] == b"%PDF"

        reader = PdfReader(io.BytesIO(content))
        page = reader.pages[0]
        w = float(page.mediabox.width)
        h = float(page.mediabox.height)
        # A5 landscape ≈ 595.3 × 419.5 pt
        assert abs(w - 595.3) < 2 and abs(h - 419.5) < 2, f"page size {w}x{h}"

        text = page.extract_text() or ""
        for needle in [
            "S V GROUP OF INSTITUTIONS", "PAYMENT RECEIPT",
            "Receipt No.: SVR-", "Date:",
            "RECEIVED WITH THANKS FROM", "AMOUNT RECEIVED",
            "INR", "Rupees (in words)", "MODE",
            "Reference / UTR", "Fees Planned",
            "Total Collected", "Balance",
            "Authorised Signatory", "Generated on",
        ]:
            assert needle in text, f"missing '{needle}' in PDF text"
        # d/m/yyyy stamp
        assert re.search(r"Generated on \d{1,2}/\d{1,2}/\d{4}", text), "d/m/yyyy stamp missing"

    def test_receipt_no_stable_across_two_downloads(self, sess, app_id):
        r = sess.get(f"{BASE_URL}/api/applications/{app_id}", timeout=10)
        pid = r.json()["payments"][0]["id"]
        # first fetch
        p1 = sess.get(f"{BASE_URL}/api/applications/{app_id}", timeout=10).json()
        rno1 = next(p["receipt_no"] for p in p1["payments"] if p["id"] == pid)
        # second fetch after PDF download
        sess.get(f"{BASE_URL}/api/applications/{app_id}/payments/{pid}/receipt.pdf", timeout=15)
        p2 = sess.get(f"{BASE_URL}/api/applications/{app_id}", timeout=10).json()
        rno2 = next(p["receipt_no"] for p in p2["payments"] if p["id"] == pid)
        assert rno1 == rno2


# ------------- Public track + copy PDF -------------
class TestPublicTrack:
    def test_track_valid(self):
        r = requests.get(f"{BASE_URL}/api/applications/track/{FIXTURE_APP_NUMBER}", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data.get("application_number") == FIXTURE_APP_NUMBER
        assert "status" in data and "full_name" in data

    def test_track_invalid_404(self):
        r = requests.get(f"{BASE_URL}/api/applications/track/SVN-000000-XXXX", timeout=10)
        assert r.status_code == 404

    def test_public_copy_pdf(self):
        r = requests.get(f"{BASE_URL}/api/applications/copy/{FIXTURE_APP_NUMBER}.pdf", timeout=20)
        assert r.status_code == 200
        assert "application/pdf" in r.headers.get("content-type", "")
        assert r.content[:4] == b"%PDF"


# ------------- Colleges CRUD -------------
class TestColleges:
    def test_seed_fixtures_intact(self):
        r = requests.get(f"{BASE_URL}/api/colleges", timeout=10)
        assert r.status_code == 200
        by_id = {c["id"]: c for c in r.json()}
        assert "svcon" in by_id and "drvson" in by_id
        svcon_courses = {c["id"] for c in by_id["svcon"]["courses"]}
        assert {"bsc-nursing", "msc-nursing"}.issubset(svcon_courses)
        assert any(c["id"] == "dgnm" for c in by_id["drvson"]["courses"])

    def test_full_college_lifecycle(self, sess):
        # Create
        r = sess.post(f"{BASE_URL}/api/admin/colleges", json={
            "name": "TEST_Pytest College", "campus": "Nowhere",
            "domain": "test", "active": True, "courses": []
        }, timeout=10)
        assert r.status_code in (200, 201), r.text[:200]
        cid = r.json()["id"]
        try:
            # Add course
            rc = sess.post(f"{BASE_URL}/api/admin/colleges/{cid}/courses", json={
                "name": "TEST_Course One", "duration": "1 Year", "seats": 10,
                "eligibility": "10+2", "active": True,
            }, timeout=10)
            assert rc.status_code in (200, 201)
            course_id = rc.json()["id"]

            # Update course (rename + toggle)
            ru = sess.patch(f"{BASE_URL}/api/admin/colleges/{cid}/courses/{course_id}",
                            json={"name": "TEST_Course Renamed"}, timeout=10)
            assert ru.status_code == 200
            updated = next(c for c in ru.json()["courses"] if c["id"] == course_id)
            assert updated["name"] == "TEST_Course Renamed"

            # Toggle active=False
            rt = sess.patch(f"{BASE_URL}/api/admin/colleges/{cid}/courses/{course_id}",
                            json={"active": False}, timeout=10)
            assert rt.status_code == 200
            # Public list should hide it
            pub = requests.get(f"{BASE_URL}/api/colleges", timeout=10).json()
            found_col = next((c for c in pub if c["id"] == cid), None)
            if found_col:
                assert all(c["id"] != course_id for c in found_col["courses"]), "inactive course leaked"

            # Delete course
            rd = sess.delete(f"{BASE_URL}/api/admin/colleges/{cid}/courses/{course_id}", timeout=10)
            assert rd.status_code == 200
        finally:
            # Delete college
            sess.delete(f"{BASE_URL}/api/admin/colleges/{cid}", timeout=10)
        # Confirm gone
        r_after = sess.get(f"{BASE_URL}/api/admin/colleges", timeout=10).json()
        assert all(c["id"] != cid for c in r_after)


# ------------- Bulk import -------------
class TestBulkImport:
    def test_import_one_valid_one_invalid(self, sess):
        payload = {"students": [
            {"full_name": "TEST_BulkValid", "mobile": "9999911111",
             "email": "bulkvalid@test.local", "collegeId": "svcon", "courseId": "bsc-nursing",
             "year1": "10000"},
            {"full_name": "TEST_BulkInvalid", "mobile": "9999922222",
             "email": "bulkinvalid@test.local", "collegeId": "svcon", "courseId": "UNKNOWN_COURSE"},
        ]}
        r = sess.post(f"{BASE_URL}/api/admin/students/bulk-import", json=payload, timeout=20)
        assert r.status_code == 200, r.text[:300]
        body = r.json()
        assert body["created"] == 1
        assert body["failed"] == 1
        created_row = next(x for x in body["results"] if x["ok"])
        failed_row = next(x for x in body["results"] if not x["ok"])
        assert "Unknown courseId" in " ".join(failed_row["errors"])

        # Cleanup: delete the created student
        appnum = created_row["application_number"]
        r_lookup = sess.get(f"{BASE_URL}/api/applications/by-number/{appnum}", timeout=10)
        assert r_lookup.status_code == 200
        aid = r_lookup.json()["id"]
        d = sess.delete(f"{BASE_URL}/api/applications/{aid}", timeout=10)
        assert d.status_code in (200, 204)


# ------------- Admin stats -------------
class TestAdminStats:
    def test_admin_stats_shape(self, sess):
        r = sess.get(f"{BASE_URL}/api/admin/stats", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("total", "byStatus", "byCollege", "byMonth", "appsByMonth", "totalCollected"):
            assert k in d, f"missing key {k}"
        assert isinstance(d["byMonth"], list) and len(d["byMonth"]) == 6
        for row in d["byMonth"]:
            assert set(row.keys()) >= {"key", "label", "amount"}
        assert isinstance(d["byCollege"], list)


# ------------- Application PDF -------------
class TestApplicationPDF:
    def test_admin_application_pdf(self, sess, app_id):
        r = sess.get(f"{BASE_URL}/api/applications/{app_id}/application.pdf", timeout=25)
        assert r.status_code == 200
        assert r.content[:4] == b"%PDF"
        reader = PdfReader(io.BytesIO(r.content))
        text = "".join((p.extract_text() or "") for p in reader.pages)
        assert FIXTURE_APP_NUMBER in text


# ------------- Payment fields: date + fee_type + receiver -------------
class TestPaymentFields:
    def test_add_payment_with_full_fields(self, sess, app_id):
        import uuid as _uuid
        tag = f"TEST_pytest_fields_{_uuid.uuid4().hex[:6]}"
        payload = {
            "amount": 500, "mode": "UPI", "utr": "TESTUTR001",
            "remarks": tag, "date": "2026-01-16",
            "fee_type": "Uniform Fees", "receiver": "Admissions Test Cell",
        }
        r = sess.post(f"{BASE_URL}/api/applications/{app_id}/payments", json=payload, timeout=15)
        assert r.status_code in (200, 201), r.text[:300]
        pay = next((p for p in r.json()["payments"] if p.get("remarks") == tag), None)
        assert pay is not None
        assert pay.get("fee_type") == "Uniform Fees"
        assert pay.get("receiver") == "Admissions Test Cell"
        assert pay.get("date") == "2026-01-16"
        pid = pay["id"]
        d = sess.delete(f"{BASE_URL}/api/applications/{app_id}/payments/{pid}", timeout=10)
        assert d.status_code in (200, 204)


# ------------- Fee years scholarship -------------
class TestScholarship:
    def test_scholarship_reduces_total(self, sess, app_id):
        # capture current
        cur = sess.get(f"{BASE_URL}/api/applications/{app_id}", timeout=10).json()
        cur_years = cur.get("fee_years") or {}
        cur_schol = cur.get("scholarship_amount") or 0
        # set scholarship 10000
        r = sess.patch(f"{BASE_URL}/api/applications/{app_id}/fee-years",
                       json={"fee_years": cur_years, "scholarship_amount": 10000}, timeout=10)
        assert r.status_code == 200
        d = r.json()
        expected = max(0.0, sum(float(v or 0) for v in cur_years.values()) - 10000)
        assert abs(float(d.get("fee_total") or 0) - expected) < 1, f"fee_total {d.get('fee_total')} vs {expected}"
        assert float(d.get("scholarship_amount") or 0) == 10000
        # revert
        r2 = sess.patch(f"{BASE_URL}/api/applications/{app_id}/fee-years",
                        json={"fee_years": cur_years, "scholarship_amount": cur_schol}, timeout=10)
        assert r2.status_code == 200
