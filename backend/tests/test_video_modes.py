"""Backend tests for the new hero-video modes (upload/youtube/link),
GridFS raw upload, 40 MB cap, legacy fallback and PUT merge regression.
Preserves site_content.hero.video_media_id = '6abed24ce3c1d38a2ac02221' at end.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sv-health-education.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admissions@svinstitutions.co.in"
ADMIN_PASS = "SvAdmin@2025"
REAL_MEDIA_ID = "6abed24ce3c1d38a2ac02221"   # user's current hero video (preserve)
LEGACY_MEDIA_ID = "6abeae76f932fc8791fc8c55"  # one of 5 legacy base64 docs


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=20)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text[:200]}"
    tok = r.json().get("access_token")
    if tok:
        s.headers.update({"Authorization": f"Bearer {tok}"})
    return s


# ---------- Content shape ----------

def test_content_hero_has_new_fields():
    r = requests.get(f"{BASE_URL}/api/content", timeout=15)
    assert r.status_code == 200
    hero = r.json()["hero"]
    assert "video_kind" in hero
    assert "video_link" in hero
    assert "video_url" in hero
    assert "video_embed" in hero  # derived
    # Current server state must preserve user's real upload
    assert hero.get("video_media_id") == REAL_MEDIA_ID, f"video_media_id drifted: {hero.get('video_media_id')}"
    assert hero["video_url"] == f"/api/media/{REAL_MEDIA_ID}"


# ---------- Legacy media fallback (base64 collection) ----------

def test_legacy_media_still_served():
    r = requests.get(f"{BASE_URL}/api/media/{LEGACY_MEDIA_ID}", timeout=30)
    assert r.status_code == 200, r.text[:200]
    assert r.headers.get("content-type", "").startswith("video/")


def test_current_hero_media_served():
    r = requests.get(f"{BASE_URL}/api/media/{REAL_MEDIA_ID}", headers={"Range": "bytes=0-1023"}, timeout=60)
    assert r.status_code in (200, 206)
    assert r.headers.get("content-type", "").startswith("video/")


# ---------- GridFS raw upload + 40 MB cap ----------

def test_raw_upload_small_video_and_delete(session):
    body = b"\x00" * (256 * 1024)  # 256 KB dummy
    r = session.post(
        f"{BASE_URL}/api/admin/media/raw",
        params={"name": "test_tiny.mp4", "mime": "video/mp4"},
        data=body,
        headers={"Content-Type": "application/octet-stream"},
        timeout=60,
    )
    assert r.status_code == 200, r.text[:200]
    j = r.json()
    assert j["size"] == len(body)
    assert j["mime"] == "video/mp4"
    assert j["url"] == f"/api/media/{j['id']}"
    new_id = j["id"]

    # GET the just-uploaded media
    g = requests.get(f"{BASE_URL}/api/media/{new_id}", timeout=30)
    assert g.status_code == 200
    assert g.headers.get("content-type", "").startswith("video/")
    assert len(g.content) == len(body)

    # Cleanup
    d = session.delete(f"{BASE_URL}/api/admin/media/{new_id}", timeout=30)
    assert d.status_code == 200


def test_raw_upload_over_40mb_rejected(session):
    body = b"\x00" * (40 * 1024 * 1024 + 1024)  # 40 MB + 1 KB
    r = session.post(
        f"{BASE_URL}/api/admin/media/raw",
        params={"name": "too_big.mp4", "mime": "video/mp4"},
        data=body,
        headers={"Content-Type": "application/octet-stream"},
        timeout=120,
    )
    assert r.status_code == 422, r.status_code
    assert "40" in r.text or "larger" in r.text.lower()


def test_raw_upload_junk_mime_accepted(session):
    body = b"hello" * 100
    r = session.post(
        f"{BASE_URL}/api/admin/media/raw",
        params={"name": "junk", "mime": "application/x-foo-bar"},
        data=body,
        headers={"Content-Type": "application/octet-stream"},
        timeout=30,
    )
    assert r.status_code == 200
    new_id = r.json()["id"]
    session.delete(f"{BASE_URL}/api/admin/media/{new_id}", timeout=30)


# ---------- YouTube embed parsing ----------

@pytest.mark.parametrize("link", [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
])
def test_youtube_embed_resolves(session, link):
    # Switch mode to youtube and set link
    r = session.put(
        f"{BASE_URL}/api/admin/content",
        json={"hero": {"video_kind": "youtube", "video_link": link}},
        timeout=20,
    )
    assert r.status_code == 200
    hero = r.json()["hero"]
    assert hero["video_kind"] == "youtube"
    assert hero["video_link"] == link
    assert "youtube-nocookie.com/embed/dQw4w9WgXcQ" in hero["video_embed"]
    assert "autoplay=1" in hero["video_embed"]
    assert "mute=1" in hero["video_embed"]
    assert "loop=1" in hero["video_embed"]
    # CRITICAL: siblings preserved
    assert hero["video_media_id"] == REAL_MEDIA_ID


# ---------- Link mode ----------

def test_link_mode_populates_source_order(session):
    link = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
    r = session.put(
        f"{BASE_URL}/api/admin/content",
        json={"hero": {"video_kind": "link", "video_link": link}},
        timeout=20,
    )
    assert r.status_code == 200
    hero = r.json()["hero"]
    assert hero["video_kind"] == "link"
    assert hero["video_link"] == link
    assert hero["video_embed"] == ""  # only youtube mode produces embed
    assert hero["video_media_id"] == REAL_MEDIA_ID  # untouched


# ---------- PUT merge regression (the bug that wiped siblings) ----------

def test_partial_put_merges_without_wiping(session):
    # Snapshot
    before = requests.get(f"{BASE_URL}/api/content", timeout=15).json()["hero"]
    assert before["video_media_id"] == REAL_MEDIA_ID

    # Partial PUT — only video_link
    r = session.put(
        f"{BASE_URL}/api/admin/content",
        json={"hero": {"video_link": "x"}},
        timeout=20,
    )
    assert r.status_code == 200
    after = r.json()["hero"]
    assert after["video_link"] == "x"
    assert after["video_media_id"] == REAL_MEDIA_ID  # NOT wiped
    assert after["video_kind"] == before["video_kind"]
    assert after["headline_lines"] == before["headline_lines"]
    assert after["stats"] == before["stats"]


# ---------- Restore clean state (MUST BE LAST) ----------

def test_zzz_restore_clean_state(session):
    """Reset to upload mode, clear video_link, preserve video_media_id."""
    r = session.put(
        f"{BASE_URL}/api/admin/content",
        json={"hero": {"video_kind": "upload", "video_link": "", "video_media_id": REAL_MEDIA_ID}},
        timeout=20,
    )
    assert r.status_code == 200
    final = requests.get(f"{BASE_URL}/api/content", timeout=15).json()["hero"]
    assert final["video_kind"] == "upload"
    assert final["video_link"] == ""
    assert final["video_media_id"] == REAL_MEDIA_ID
    assert final["video_url"] == f"/api/media/{REAL_MEDIA_ID}"
    assert final["video_embed"] == ""
