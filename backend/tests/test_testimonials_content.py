"""Tests for Reels/Testimonials CMS + content partial-update regression."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

ADMIN_EMAIL = "admissions@svinstitutions.co.in"
ADMIN_PASSWORD = "SvAdmin@2025"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return s


# ---- GET /api/content: sections presence ----
def test_content_has_all_sections():
    r = requests.get(f"{BASE_URL}/api/content", timeout=15)
    assert r.status_code == 200
    data = r.json()
    for key in ("contact", "hero", "gallery", "facilities", "faq", "testimonials"):
        assert key in data, f"missing section: {key}"
    assert isinstance(data["testimonials"].get("items"), list)


# ---- Testimonials round-trip: add, verify, edit, verify, remove, verify ----
def test_testimonials_round_trip(admin_session):
    # 1. Capture baseline faq + gallery for regression comparison
    base = requests.get(f"{BASE_URL}/api/content", timeout=15).json()
    faq_before = base["faq"]
    gallery_before = base["gallery"]

    # 2. Add a reel
    reel = {
        "id": "TEST_reel_1",
        "name": "TEST Student",
        "programme": "B.Sc Nursing",
        "quote": "This is a test reel.",
        "video_link": "/hero.webm",
    }
    r = admin_session.put(
        f"{BASE_URL}/api/admin/content",
        json={"testimonials": {"items": [reel]}}, timeout=15)
    assert r.status_code == 200, r.text
    out = r.json()
    items = out["testimonials"]["items"]
    assert len(items) == 1
    assert items[0]["name"] == "TEST Student"
    # derived video_url populated
    assert items[0].get("video_url") == "/hero.webm"

    # 3. Faq + gallery untouched (partial update regression)
    assert out["faq"] == faq_before
    assert out["gallery"] == gallery_before

    # 4. GET from public endpoint shows the reel
    pub = requests.get(f"{BASE_URL}/api/content", timeout=15).json()
    assert len(pub["testimonials"]["items"]) == 1
    assert pub["testimonials"]["items"][0]["quote"] == "This is a test reel."

    # 5. Edit the quote
    reel["quote"] = "Edited quote."
    r = admin_session.put(
        f"{BASE_URL}/api/admin/content",
        json={"testimonials": {"items": [reel]}}, timeout=15)
    assert r.status_code == 200
    assert r.json()["testimonials"]["items"][0]["quote"] == "Edited quote."

    # 6. Remove (empty items) — cleanup
    r = admin_session.put(
        f"{BASE_URL}/api/admin/content",
        json={"testimonials": {"items": []}}, timeout=15)
    assert r.status_code == 200
    assert r.json()["testimonials"]["items"] == []

    # 7. Verify public reflects empty state
    pub = requests.get(f"{BASE_URL}/api/content", timeout=15).json()
    assert pub["testimonials"]["items"] == []
    # faq/gallery still intact after multiple partial saves
    assert pub["faq"] == faq_before
    assert pub["gallery"] == gallery_before


# ---- Other partial saves still work (no testimonials wipe) ----
def test_partial_save_hero_keeps_testimonials(admin_session):
    # Seed one reel
    reel = {"id": "TEST_keep", "name": "T", "programme": "P", "quote": "Q", "video_link": "/hero.webm"}
    admin_session.put(f"{BASE_URL}/api/admin/content",
                      json={"testimonials": {"items": [reel]}}, timeout=15)
    # Save hero (dummy no-op field)
    cur_hero = requests.get(f"{BASE_URL}/api/content", timeout=15).json()["hero"]
    r = admin_session.put(f"{BASE_URL}/api/admin/content",
                          json={"hero": {"headline": cur_hero.get("headline", "")}}, timeout=15)
    assert r.status_code == 200
    # testimonials still has the reel
    assert len(r.json()["testimonials"]["items"]) == 1
    # cleanup
    admin_session.put(f"{BASE_URL}/api/admin/content",
                      json={"testimonials": {"items": []}}, timeout=15)
