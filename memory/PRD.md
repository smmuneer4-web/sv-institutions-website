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

## Implemented (2026-09-30, session 6 — Instagram Login token flow)
- Added the Instagram User token exchange per Meta docs (user pasted /access_token spec): POST /api/admin/instagram with App Secret only → graph.instagram.com/access_token?grant_type=ig_exchange_token (1-hour → 60-day); App ID + Secret → Facebook exchange (fb_exchange_token); exchange failure falls back to the pasted token
- Feed fetch fallback chain: graph.instagram.com/me business_discovery → /me user_id + discovery on numeric IG id → graph.facebook.com/me/accounts page-linked discovery
- Instagram tab instructions rewritten for the Instagram Login flow (API setup with Instagram Login → Generate token = already long-lived; or Graph API Explorer + App Secret auto-exchange); labels clarify App Secret (Instagram apps) vs App ID (Facebook tokens)
- Verified: garbage token → clean 502 JSON with guidance (preview proxy WAF may wrap it in HTML — production Render unaffected); token never leaks via public endpoints

## Backlog / Next
- P1: Email notification (Resend) to admissions on new application/enquiry.
- P2: WhatsApp Business automation (user deferred) — auto-send reminders instead of manual link.
- P2: Document uploads (10th/12th marksheets) via object storage; PDF export of applications from dashboard.
- P2: Real campus photos for gallery when provided.
- P3: Dashboard inline payment could surface the new receipt no. (toast) for discoverability.
