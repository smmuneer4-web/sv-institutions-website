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

## Backlog / Next
- P1: Email notification (Resend) to admissions on new application/enquiry.
- P2: Document uploads (10th/12th marksheets) via object storage; PDF export of applications from dashboard.
- P2: Real campus photos for gallery when provided.
