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
- Verified: curl POST/GET, desktop + mobile screenshots (no overflow-x, form success panel confirmed).

## Backlog / Next
- P1: Admin panel to view/reply to enquiries (currently view via GET /api/enquiries).
- P1: Email notification (Resend) on new enquiry.
- P2: Photo gallery, faculty pages (user opted out of testimonials/news for v1).
