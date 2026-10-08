# PRD — S V College of Nursing Landing Page

## Original Problem Statement
Build a landing page for S V College of Nursing (https://littleflowerinstitutions.com/our-colleges/s-v-colleges/s-v-college-of-nursing/), taking all details from that link, using the provided S V College of Nursing logo, branded under "S V GROUP OF INSTITUTIONS". User additions: design must match the logo colours (pink/crimson + teal, white background), include a working Apply Now admission enquiry form saved to database, list colleges and course details from both source links (S V College of Nursing + D R Vijayakumari School of Nursing), and no testimonials/news sections.

## User Personas
- Prospective student / parent: researches nursing programs (B.Sc, M.Sc, GNM), checks eligibility, seats, affiliations, and submits an admission enquiry.
- Institution admin: receives enquiries saved in MongoDB (GET /api/enquiries).

## Core Requirements (static)
- All facts sourced from the two official college pages: programs, durations, seats, eligibility, affiliations (RGUHS, KSNC, INC), address, phone, email, trust (Sandesh Educational Cultural and Charitable Trust, since 2002).
- Logo: user-uploaded S V College of Nursing logo; SVG favicon echo of the mark.

## Architecture
- Frontend: React (CRA) + Tailwind + framer-motion + lenis smooth scroll. Single-page landing, no router.
  - Components: Navbar (glass, mobile drawer), Hero (masked line-by-line reveal, 3D tilt image card, rotating badge, parallax), Marquee (slow editorial, crimson band), About (bento), Colleges (2 cards), Courses (3 program cards with pre-fill apply buttons), Affiliations (dark crimson band), Facilities (bento with imagery), ApplyForm (enquiry form + inline success state), Footer (contact + links).
  - Course "Apply for this Course" buttons dispatch a prefill event that selects college + program in the form and smooth-scrolls to it.
- Backend: FastAPI on :8001, MongoDB via MONGO_URL/DB_NAME env.
  - POST /api/enquiries — validate + save enquiry (name, phone, email, college, program, city, message).
  - GET /api/enquiries — list (newest first).
  - Models use PyObjectId/BaseDocument (no raw ObjectId leakage).

## Implemented (2026-09-29)
- Full landing page with all sections above, logo colours (#BE185D crimson, #0D9488 teal, ivory background), Cormorant Garamond display + Plus Jakarta Sans body.
- Enquiry form working end-to-end: submitted test entries verified in MongoDB via GET /api/enquiries.
- Approval certificate popups: RGUHS/KSNC/INC cards open a PDF viewer modal with the official uploaded letters (rguhs-svcon.pdf, inc-svcon.pdf, ksnc-svcon.pdf, ksnc-drvson.pdf; KSNC has college tabs).
- Branding: navbar/footer wordmark "S V GROUP OF INSTITUTIONS"; contact +91 90378 34632 / admissions@svinstitutions.co.in; tab title "S V INSTITUTIONS" + logo favicon.
- Gallery section (Life @ S V): 6-tile bento with hover zoom + lightbox; nav link added.
- Application portal (/apply): 6-step Student Application Form with per-step validation, progress bar, client-side photo resize, application numbers (SVN-YYYYMM-XXXX).
- Admissions Console (/admin) modelled on the Little Flower reference console: topbar with nav tabs (Overview / Students & Fees) + session pill + sign out, Applications/Enquiries tabs, stat cards, breakdown panels, filters, search, applications table, full detail modal (WhatsApp student/guardian, email, status editor, admin notes, delete). Enquiries tab with WhatsApp/email/delete actions. JWT bcrypt-cookie auth; enquiries list admin-protected; DELETE /api/enquiries/{id} added.
- Students & Fee Collection (/admin/students): tracked students (shortlisted/approved), stats (Total Students / Planned Fees / Collected / Outstanding in ₹), college filter + search, table with Plan/Collected/Balance/Status; row links to per-student page /admin/students/:applicationNumber modelled on the reference: header with Send Reminder (WhatsApp, count badge) + Download PDF (print), overdue-installment banner (count + outstanding), profile card with inline Edit (name/mobile/email), stat cards (Planned/Scheduled/Collected/Balance), per-year Fee Plan editor (auto-totals to planned), Payment Schedule (add/edit/delete installments with due dates, overdue pills, total), Payments Collected (log/edit/delete payments linked to schedules, method, remarks, total), status/notes editor + delete. Backend: fee-years/schedules/payments CRUD endpoints; payments retrofitted with ids; profile fields editable via PATCH.
- Deployment: frontend on Vercel (react-scripts build; all @/ imports converted to relative; vercel.json SPA rewrites; .npmrc legacy-peer-deps; date-fns pinned v3; ajv v8 pinned). Backend on Render (uvicorn start command; requirements trimmed to public-PyPI packages; verify_password exception-safe + seed self-heals corrupt admin hashes). Cross-site auth: login/refresh also return JWTs in the response body; axios stores them in localStorage and sends Authorization: Bearer (cookie-block-proof across Vercel→Render), with single-retry refresh on 401; httpOnly cookies retained for same-site preview.
- Incident resolved: manually-added plain-text admin hash in Atlas caused login 500s + startup crash loop; data repaired and code hardened.

## Implemented (2026-09-30, session 2)
- Reference-parity batch (user supplied the Little Flower portal zip; all functions ported to S V branding; dark mode skipped by choice):
  - Apply form: 10th/12th marksheet uploads (FileUpload, client compression), draft auto-save (sv_application_draft), dynamic college/course dropdowns from GET /api/colleges (useColleges hook + FALLBACK_COLLEGES), upgraded success screen (copy ID, what's-next, contact cards, Download PDF copy, Start New), public Track panel (status stepper)
  - Public endpoints: GET /api/applications/track/{n}, GET /api/applications/copy/{n}.pdf (branded application PDF, ReportLab, A4)
  - Admin: GET /api/applications/{id}/application.pdf, CollegesManager page (/admin/colleges) with college+course CRUD/active toggles (DB collection, seeded svcon+drvson), bulk CSV import (BulkImportDialog + POST /api/admin/students/bulk-import), Recharts dashboard (StatusDonut/CollegeBar/RevenueArea from GET /api/admin/stats), ReminderDialog (editable msg, WhatsApp student/guardian, email, copy), ApplicationEditorModal (full-field PATCH), payments with date/fee_type/receiver, scholarship_amount deducted in fee plan
- Fee receipt PDF REBUILT to the user's attached template: A5 LANDSCAPE (595.3x419.5), gold double-frame + cream page bg, maroon PAYMENT RECEIPT band left with Receipt No./Date right, received-with-thanks block, AMOUNT RECEIVED cream box w/ gold border, MODE right, words, 5 alternating-cream financial bands, signatory, footer "Generated on d/m/yyyy, h:mm:ss am/pm"
- Testing: backend pytest 20/20 (/app/backend/tests/test_receipts.py, test_sv_features.py); full UI suite iteration_2 — one bug found+fixed (CollegesManager run() missing promise return) and re-verified

## Implemented (2026-09-30, session 3 — visual edits)
- Gallery rebuilt as an Instagram-style feed (per visual editor edit): profile strip (IG-gradient avatar ring, @svinstitutions handle, Follow button → instagram.com/svinstitutions — placeholder handle via INSTAGRAM_HANDLE const in Gallery.jsx), authentic 3-col square-tile grid with tight gutters, IG glyph per tile, hover overlay (heart/comment + caption), tap hint on mobile; lightbox kept
- Section gaps normalized+tightened across landing (About, Colleges, Courses, Affiliations, Gallery): one scale py-20 lg:py-28 (was py-24 lg:py-32)

## Implemented (2026-09-30, session 4 — visual edits round 2)
- Instagram handle set to the real one: @svgoiofficial (INSTAGRAM_HANDLE const in Gallery.jsx; profile link https://www.instagram.com/svgoiofficial)
- Facilities: big labs photo tile replaced with a maroon brand tile (Stethoscope icon, dot texture, glow) — photo removed per visual edit
- Hero: arch-frame card is now a VIDEO hero — self-hosted looping clinic video (public/hero.mp4 3.6MB H.264 + public/hero.webm 780KB VP9 fallback, dual <source>, poster = previous hero image, autoplay muted loop playsinline). Hotlinked stock clips are referer-blocked, hence self-hosted; ships to Vercel with the repo. Verified playing (readyState 4) on desktop and loaded on mobile 390px
- Pending note: embedding the LIVE Instagram feed (latest posts in-page) needs an Instagram access token from their business account — offered as next step

## Implemented (2026-09-30, session 5 — CMS + Instagram live feed)
- Admin Site Content manager (/admin/content, Topbar "Site Content"): tabs Details (name/tagline/email/phone/address/IG handle/hero stats), Hero (headline lines, paragraph, video upload ≤8MB, cover photo), Gallery (add/remove photos + captions/tags), Facilities (hostel photo), Instagram (token paste + connect)
- Backend: media library (POST/DELETE /api/admin/media ≤9MB, public GET /api/media/{id} with Range/immutable cache), public GET /api/content merged over DEFAULT_CONTENT, admin PUT /api/admin/content; receipts + application PDFs now use the editable contact details; Instagram Business Discovery (graph.instagram.com/me → graph.facebook.com fallback via me/accounts), token auto-extended to 60-day long-lived when app id+secret pasted, posts cached in ig_posts, lazy 15-min refresh on public GET /api/instagram/posts, token never exposed
- Gallery shows LIVE Instagram posts (permalinks) when connected; else editable static photos
- Testing: backend 36/36 (new test_content_media_instagram.py); UI suite found one CRITICAL (landing crash: DEFAULT_CONTENT.hero lacked video_url/poster_url → Hero.jsx undefined.endsWith) — fixed (defaults seeded + .filter(Boolean)) and re-verified live: no error boundary, video playing, 6 tiles, footer phone from CMS
- Note: server.py ~1900 lines — refactor into routers flagged as future cleanup

## Implemented (2026-10-01, session 8 — cinematic hero)
- Hero rewritten as a CINEMATIC full-viewport video hero per user request: admin's uploaded video plays full-bleed edge-to-edge behind the headline; scroll-driven zoom (scale 1→1.14 + y drift) and story fade via framer useScroll; cinematic overlay stack (left readability gradient, bottom dark gradient, grain dots, vignette); white display type + pink italic line 2; glass badge + CTAs; spinning brand seal (lg+); bottom glass stats band from editable hero.stats + animated SCROLL cue (→ #about); poster = hero.poster_url; deduped sources [video_url, /hero.mp4, /hero.webm] with filter(Boolean)
- Tested (iteration_5, all pass): hero fills viewport (102%/109% at 1440/390), video playing, source order correct (custom media first; headless plays hero.webm fallback — expected), scroll zoom/fade verified with transforms, EnquiryModal works over the video, programs/scroll cues navigate, short viewport 700px shows no CTA/band overlap, CMS headline edit reflects live (reverted), 7 gallery tiles + all sections + footer intact, zero console errors, zero overflow
- Carry-over from iteration_4 (ContentPage stale-draft) was ALREADY fixed in session 7 via useContentStrict — confirmed on fresh load (Hero tab shows 'Custom video set' + Reset); iteration_5 flagged it only because it wasn't in its scope

## Implemented (2026-10-01, session 9 — unified admin console)
- User report: "Overview click redirects to another page, merge all in one console". RCA: Topbar pills used raw <a href> → full SPA reload → login-screen flash on /admin; Overview page had its own separate header without pills. FIXED: Topbar pills + logo now react-router <Link> (true SPA nav, marker proven to survive clicks); AdminPage inline header replaced with shared <Topbar active="overview"> — all 4 console pages (Overview/Students & Fees/Colleges & Courses/Site Content) share identical chrome
- Testing agent (iteration_6, 100% pass) also caught + fixed a new SPA crash: ContentPage 'Cannot read properties of null (reading contact)' on warm-cache SPA navigation — loading guard extended to `!content || !draft` (line 192). Self-verified: first visit + SPA revisit both render, all 5 tabs usable
- Backlog (from tester code review): dedupe AdminPage constants (STATUSES/COLLEGES/STATUS_STYLE/... duplicate lib/admin exports); split AdminPage (704 lines) into DetailModal/PaymentCell/tabs components; ContentPage draft via useMemo

## Implemented (2026-10-01, session 10 — "video not working after uploaded" RCA + fix)
- TRUE ROOT CAUSE (testing-verified): <video> reads its <source> children ONCE at mount (HTML spec). The landing page mounted with DEFAULT_CONTENT (stock /hero.mp4) during the ~200-500ms /api/content in-flight window; when the real content arrived the React re-render updated the <source src> attributes but the mounted video IGNORED them — the user always saw the stock video no matter how many times they uploaded (5 successful uploads in DB, all 200 OK; content reference always correct; media serving verified 200 full + 206 range)
- FIX: <video key={hero.video_url}> in Hero.jsx — forces React remount + fresh source enumeration whenever the uploaded video changes. VERIFIED (iteration_7, 100%): while the page was open, swapping video_media_id via PUT /api/admin/content remounted the video with the new /api/media source WITHOUT page reload (window.__marker survived), currentTime advances (playing), restored to the user's newest upload 6abed24ce3c1d38a2ac02221 afterwards; zero JS errors; 1440+390 no overflow
- Backlog note: module-level content cache is only invalidated by admin saves (refetchContent) — fine today; expose a force-refresh if non-admin UI ever mutates content

## Implemented (2026-10-01, session 11 — HD video: GridFS 40MB + YouTube/Link modes)
- User report: "Video quality is tooo low. i think its 8 mb may be, can add one more option of video Url"
- Media storage moved to GRIDFS (AsyncIOMotorGridFSBucket, bucket media_fs) — no 16MB BSON doc limit. NEW POST /api/admin/media/raw?name=&mime= (raw binary body, 40MB cap) for big videos; JSON dataURL path stays for images (≤9MB). GET /api/media/{id}: GridFS first, legacy base64-collection fallback (user's 5 old docs still play), Range + immutable cache kept; DELETE handles both storages
- Content: hero.video_kind ('upload'|'youtube'|'link') + hero.video_link; GET /api/content derives hero.video_embed via _youtube_embed (watch?v= / youtu.be / shorts / embed / raw id → youtube-nocookie autoplay+mute+loop+no-controls). PUT /api/admin/content now MERGES per section-key (partial saves no longer wipe siblings — wipe bug found+fixed during testing)
- Hero tab: 3 source pills (Upload up to 40MB / YouTube video / Video link MP4-WebM) with Save & Apply for link modes; raw upload via axios octet-stream (300s timeout). Hero.jsx: youtube mode renders pointer-events-none oversized nocookie iframe (cover crop), link mode prepends the URL as first <source>
- Tested (iteration_8, backend 13/13 + frontend 100%): all 3 modes, all YT URL forms, iframe z-order under CTAs, link source order, partial-PUT merge regression, legacy fallback, 40MB+1B → 422 friendly message; final state restored: kind=upload, video_media_id=6abed24ce3c1d38a2ac02221 (user's real video — active in preview)
- Backlog: RAW endpoint trusts ?mime= (admin-only, acceptable); VideoUpload pill click saves full draft.hero (single-admin flow fine); 9MB message wording nit

## Implemented (2026-09-30, session 6 — Instagram Login token flow)
- Added the Instagram User token exchange per Meta docs (user pasted /access_token spec): POST /api/admin/instagram with App Secret only → graph.instagram.com/access_token?grant_type=ig_exchange_token (1-hour → 60-day); App ID + Secret → Facebook exchange (fb_exchange_token); exchange failure falls back to the pasted token
- Feed fetch fallback chain: graph.instagram.com/me business_discovery → /me user_id + discovery on numeric IG id → graph.facebook.com/me/accounts page-linked discovery
- Instagram tab instructions rewritten for the Instagram Login flow (API setup with Instagram Login → Generate token = already long-lived; or Graph API Explorer + App Secret auto-exchange); labels clarify App Secret (Instagram apps) vs App ID (Facebook tokens)
- Verified: garbage token → clean 502 JSON with guidance (preview proxy WAF may wrap it in HTML — production Render unaffected); token never leaks via public endpoints

## Implemented (2026-10-01, session 7 — "updated video not showing" RCA + fix)
- User reported the uploaded hero video not showing on the website. RCA (testing agent, iteration_4): (1) preview was fully correct — 8MB upload 'SV Institutions_VideoFull (1).mp4' (id 6abeaf20f932fc8791fc8c56, H.264+AAC) stored, served (200 video/mp4), first <source> on the landing video, plays with webm fallback in headless; 8MB uploads pass the preview proxy fine. (2) REAL BUG (HIGH): ContentPage stale-draft — useContent started from DEFAULT_CONTENT and the `content && !draft` guard never re-synced when the real content arrived → Hero tab showed 'Default stock video' + no Reset button after refresh, making the user think the upload was lost. FIXED with useContentStrict (admin pages wait for server truth; loading state while fetching). (3) The live Vercel site predates the video-hero code AND the live DB is separate — user must Deploy + re-upload the video on the live admin panel.

## Backlog / Next
- P1: Email notification (Resend) to admissions on new application/enquiry.
- P2: WhatsApp Business automation (user deferred) — auto-send reminders instead of manual link.
- P2: Real campus photos for gallery when provided.
- P3: Dashboard inline payment could surface the new receipt no. (toast) for discoverability.
- P1 (user action): Google Search Console verification + sitemap submit; Google Business Profile for map pack.
- P1 (pending info): confirm final live domain — SEO tags/canonical/sitemap assume https://www.svinstitutions.co.in; switch if Vercel domain differs.

## Implemented (2026-10-07, session 12 — SEO foundation + FAQ section)
- User goal: "I want this website to list 1st in google search". Choices: full package (technical SEO + FAQ), deploy route Github+Vercel.
- Technical SEO: keyword-rich title + meta description, robots meta, canonical, Open Graph + Twitter tags, static JSON-LD @graph (CollegeOrUniversity + ItemList of B.Sc/M.Sc/GNM Courses) in index.html; robots.txt (Disallow /admin*, /api, Sitemap line) + sitemap.xml (with lastmod) in public/.
- lib/seo.js: useSEO hook (title, description, robots meta, canonical per route). Landing + /apply get indexable titles; ALL /admin* pages get noindex,nofollow via Topbar (one hook covers every admin page).
- New components/Faq.jsx: CMS-driven accordion (rose/cream design system, Reveal reveals), injected client-side with FAQPage JSON-LD (id faq-schema). Placed between Facilities and ApplyForm.
- CMS: backend DEFAULT_CONTENT.faq (6 SEO-rich Q&As: courses, affiliation, how to apply, hostel, location, eligibility) merged like other sections; ContentUpdate.faq; ContentPage new FAQ tab (add/edit/remove/save, testids content-faq-*).
- Fixed (from test review): Save Details now also persists hero.stats edited in the same tab (was silently dropping them); sitemap lastmod added.
- Tested (iteration_9, 9/9 pass, backend+frontend 100%): FAQ render/toggle, schema injection, served HTML head, robots/sitemap served, per-page titles on SPA nav, admin noindex, CMS FAQ round-trip visible publicly, partial-save regression, admin console loads. Note: editing public/index.html requires `sudo supervisorctl restart frontend` (HtmlWebpackPlugin caches the shell) — production build unaffected.
- Build verified for Vercel: yarn build clean (16s), robots/sitemap/JSON-LD present in build output.

## Implemented (2026-10-08, session 13 — hero video sound control)
- User request: "Video hero can enable sound of playing video also give a always mute option to enable sound".
- CMS: hero.video_sound "muted" (default, previous behaviour) | "on". Pill toggle in ContentPage Hero tab (content-hero-sound-muted / -on), saves immediately via existing partial-PUT.
- Hero.jsx: visitor-facing "Tap for sound" pill in the bottom band (next to scroll cue, testid hero-sound-toggle) shown only when sound allowed. Click unmutes (user gesture satisfies browser autoplay policy); React muted-prop quirk handled by driving video.muted via ref effect. YouTube mode: embed adds enablejsapi=1; toggle posts unMute/mute commands to the iframe contentWindow.
- Self-tested E2E: sound=on → button visible desktop+mobile (no overflow), muted true→false on click, label swaps to SOUND ON, re-mute works; sound=muted → button hidden, video muted+playing (original cinematic behaviour). yarn build clean. Final state: video_sound=on.
