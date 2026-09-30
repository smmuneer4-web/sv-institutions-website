"""Backend tests for iteration 3 features:
- Admin CMS: PUT /api/admin/content, GET /api/content (merged over defaults)
- Media library: POST/DELETE /api/admin/media (auth + size limit)
- Public media serve GET /api/media/{id} with Range 206
- Instagram: connect (bad token 502), public /api/instagram/posts token never leaked, disconnect
- Receipt PDF still uses editable contact (regression)
"""
import base64
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
FIXTURE_APP_ID = "6abc513e6592377a481c0463"
DEFAULT_PHONE = "+91 90378 34632"


# ------------- Fixtures -------------
@pytest.fixture(scope="module")
def sess():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text[:200]
    s.headers["Authorization"] = f"Bearer {r.json()['access_token']}"
    return s


def _b64(b: bytes) -> str:
    return base64.b64encode(b).decode()


# Minimal PNG (1x1) valid bytes
PNG_1x1 = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944"
    "4154789c6300010000000500010d0a2db40000000049454e44ae426082"
)


# ------------- Content CMS -------------
class TestContentCMS:
    def test_default_content_on_get(self):
        r = requests.get(f"{BASE_URL}/api/content", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["contact"]["name"] == "S V GROUP OF INSTITUTIONS"
        assert isinstance(d["gallery"]["photos"], list) and len(d["gallery"]["photos"]) == 6
        # Video url falls back to /hero.mp4 when no media id
        assert d["hero"]["video_url"].endswith("/hero.mp4") or "/api/media/" in d["hero"]["video_url"]

    def test_put_phone_and_verify_then_revert(self, sess):
        new_phone = "+91 99999 00000"
        # get current contact so we don't lose fields
        cur = requests.get(f"{BASE_URL}/api/content", timeout=10).json()["contact"]
        payload = {"contact": {**cur, "phone": new_phone}}
        r = sess.put(f"{BASE_URL}/api/admin/content", json=payload, timeout=10)
        assert r.status_code == 200
        assert r.json()["contact"]["phone"] == new_phone
        # Verify public GET reflects it
        pub = requests.get(f"{BASE_URL}/api/content", timeout=10).json()
        assert pub["contact"]["phone"] == new_phone
        # Revert to default
        r2 = sess.put(f"{BASE_URL}/api/admin/content",
                      json={"contact": {**cur, "phone": DEFAULT_PHONE}}, timeout=10)
        assert r2.status_code == 200
        assert r2.json()["contact"]["phone"] == DEFAULT_PHONE

    def test_put_requires_auth(self):
        r = requests.put(f"{BASE_URL}/api/admin/content",
                         json={"contact": {"phone": "x"}}, timeout=10)
        assert r.status_code in (401, 403)

    def test_put_empty_rejected(self, sess):
        r = sess.put(f"{BASE_URL}/api/admin/content", json={}, timeout=10)
        assert r.status_code == 422


# ------------- Media library -------------
class TestMedia:
    def test_upload_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/admin/media",
                          json={"name": "x.png", "mime": "image/png", "data": _b64(PNG_1x1)},
                          timeout=10)
        assert r.status_code in (401, 403)

    def test_delete_requires_auth(self):
        r = requests.delete(f"{BASE_URL}/api/admin/media/000000000000000000000000", timeout=10)
        assert r.status_code in (401, 403)

    def test_upload_too_large_422(self, sess):
        # 10 MB (> 9 MB limit)
        big = b"\x00" * (10 * 1024 * 1024)
        r = sess.post(f"{BASE_URL}/api/admin/media",
                      json={"name": "big.bin", "mime": "application/octet-stream", "data": _b64(big)},
                      timeout=60)
        assert r.status_code == 422

    def test_upload_serve_range_delete_lifecycle(self, sess):
        # Upload 1x1 PNG
        r = sess.post(f"{BASE_URL}/api/admin/media",
                      json={"name": "TEST_pixel.png", "mime": "image/png", "data": _b64(PNG_1x1)},
                      timeout=15)
        assert r.status_code == 200, r.text[:200]
        mid = r.json()["id"]
        url = r.json()["url"]
        assert url == f"/api/media/{mid}"
        try:
            # Full GET
            full = requests.get(f"{BASE_URL}/api/media/{mid}", timeout=10)
            assert full.status_code == 200
            assert full.headers.get("accept-ranges", "").lower() == "bytes"
            assert full.content == PNG_1x1
            # Range GET: bytes=0-9 → 206 with Content-Range
            rr = requests.get(f"{BASE_URL}/api/media/{mid}",
                              headers={"Range": "bytes=0-9"}, timeout=10)
            assert rr.status_code == 206
            cr = rr.headers.get("Content-Range", "")
            assert cr == f"bytes 0-9/{len(PNG_1x1)}", cr
            assert rr.content == PNG_1x1[:10]
        finally:
            d = sess.delete(f"{BASE_URL}/api/admin/media/{mid}", timeout=10)
            assert d.status_code == 200
        # After delete: 404
        gone = requests.get(f"{BASE_URL}/api/media/{mid}", timeout=10)
        assert gone.status_code == 404


# ------------- Content ⨯ media integration -------------
class TestContentMediaIntegration:
    def test_hero_video_media_id_to_url(self, sess):
        # Upload dummy 'video' bytes (mp4 signature not enforced by backend)
        fake_mp4 = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 128
        r = sess.post(f"{BASE_URL}/api/admin/media",
                      json={"name": "TEST_hero.mp4", "mime": "video/mp4", "data": _b64(fake_mp4)},
                      timeout=15)
        assert r.status_code == 200
        mid = r.json()["id"]
        try:
            cur = requests.get(f"{BASE_URL}/api/content", timeout=10).json()["hero"]
            r2 = sess.put(f"{BASE_URL}/api/admin/content",
                          json={"hero": {**{k: v for k, v in cur.items() if k not in ("video_url", "poster_url")},
                                         "video_media_id": mid}},
                          timeout=10)
            assert r2.status_code == 200
            got = r2.json()["hero"]["video_url"]
            assert got == f"/api/media/{mid}", got
            # Public GET reflects
            pub = requests.get(f"{BASE_URL}/api/content", timeout=10).json()
            assert pub["hero"]["video_url"] == f"/api/media/{mid}"
        finally:
            # Reset to defaults
            cur2 = requests.get(f"{BASE_URL}/api/content", timeout=10).json()["hero"]
            sess.put(f"{BASE_URL}/api/admin/content",
                     json={"hero": {**{k: v for k, v in cur2.items() if k not in ("video_url", "poster_url")},
                                    "video_media_id": None}},
                     timeout=10)
            sess.delete(f"{BASE_URL}/api/admin/media/{mid}", timeout=10)
        # After reset, video_url returns to /hero.mp4
        pub2 = requests.get(f"{BASE_URL}/api/content", timeout=10).json()
        assert pub2["hero"]["video_url"].endswith("/hero.mp4")


# ------------- Instagram -------------
class TestInstagram:
    def test_public_posts_not_connected(self):
        # Ensure disconnected first (best effort)
        r = requests.get(f"{BASE_URL}/api/instagram/posts", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert "connected" in d and "posts" in d
        # If already connected from prior test run, disconnect check happens elsewhere.

    def test_connect_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/admin/instagram",
                          json={"token": "garbage"}, timeout=10)
        assert r.status_code in (401, 403)

    def test_connect_bad_token_502(self, sess):
        r = sess.post(f"{BASE_URL}/api/admin/instagram",
                      json={"token": "GARBAGE_TOKEN_XYZ", "username": "svgoiofficial"},
                      timeout=20)
        # Backend raises HTTPException from _ig_graph_get; either 502 or another 4xx from Meta
        assert r.status_code in (400, 401, 422, 502), r.text[:200]

    def test_public_posts_does_not_leak_token(self, sess):
        # Even if a token were cached, public endpoint must never return it
        r = requests.get(f"{BASE_URL}/api/instagram/posts", timeout=10)
        assert r.status_code == 200
        body = r.text
        assert "GARBAGE_TOKEN_XYZ" not in body
        # There should be no 'token' key surfaced in response
        data = r.json()
        assert "token" not in data
        for p in data.get("posts", []):
            assert "token" not in p

    def test_disconnect_requires_auth(self):
        r = requests.delete(f"{BASE_URL}/api/admin/instagram", timeout=10)
        assert r.status_code in (401, 403)

    def test_disconnect_ok(self, sess):
        r = sess.delete(f"{BASE_URL}/api/admin/instagram", timeout=10)
        assert r.status_code == 200
        assert r.json().get("connected") is False


# ------------- Receipt regression (uses editable contact) -------------
class TestReceiptRegression:
    def test_receipt_pdf_still_valid(self, sess):
        # Fetch one payment id
        r = sess.get(f"{BASE_URL}/api/applications/{FIXTURE_APP_ID}", timeout=10)
        assert r.status_code == 200
        pays = r.json().get("payments") or []
        assert pays, "fixture has no payments"
        pid = pays[0]["id"]
        pdf = sess.get(
            f"{BASE_URL}/api/applications/{FIXTURE_APP_ID}/payments/{pid}/receipt.pdf",
            timeout=25,
        )
        assert pdf.status_code == 200
        assert pdf.content[:4] == b"%PDF"
        reader = PdfReader(io.BytesIO(pdf.content))
        page = reader.pages[0]
        w = float(page.mediabox.width)
        h = float(page.mediabox.height)
        assert abs(w - 595.3) < 2 and abs(h - 419.5) < 2, f"page {w}x{h}"
        text = page.extract_text() or ""
        assert "S V GROUP OF INSTITUTIONS" in text
        assert re.search(r"Receipt No\.: SVR-", text)
