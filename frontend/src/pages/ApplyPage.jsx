import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Upload, CheckCircle2, ShieldCheck, X, Copy, Download, RotateCcw, Search, Phone, Mail, MapPin, Loader2 } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { useSEO } from "../lib/seo";
import FileUpload from "../components/FileUpload";
import { useColleges } from "../lib/colleges";

const STEPS = ["Basic Info", "Course", "Communication", "Academic", "Payment & Reference", "Declaration"];
const DRAFT_KEY = "sv_application_draft";

const PAYMENT_MODES = ["UPI", "Bank Transfer", "Cash", "Cheque", "Card", "Other"];
const REFERRALS = ["Google / Search", "Instagram", "Friend / Relative", "Newspaper", "Campus Visit", "Other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Female", "Male", "Other"];

const INITIAL = {
  full_name: "", mobile: "", email: "", dob: "", gender: "", aadhaar: "", nationality: "Indian",
  religion: "", caste: "", blood_group: "", photo: "",
  college: "", programme: "", hostel: "No", transport: "No",
  address_line1: "", address_line2: "", city: "", state: "", pincode: "",
  guardian_name: "", guardian_mobile: "", guardian_email: "", guardian_occupation: "", emergency_name: "", emergency_mobile: "",
  b10_board: "", b10_year: "", b10_pct: "", b10_school: "",
  b12_board: "", b12_year: "", b12_stream: "", b12_pct: "", b12_school: "", other_qualification: "",
  marksheet10: "", marksheet12: "",
  payment_mode: "", payment_reference: "", payment_receiver: "", referral_source: "", payment_remarks: "",
  agree_accurate: false, agree_communication: false, signature: "",
};

const TRACK_STEPS = ["submitted", "shortlist", "approved"];

const Field = ({ label, required, children }) => (
  <div>
    <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
      {label} {required && <span className="text-[#BE185D]">*</span>}
    </label>
    {children}
  </div>
);

function TrackPanel() {
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const search = () => {
    const n = number.trim().toUpperCase();
    if (!n) return setError("Please enter your application number.");
    setBusy(true);
    setError("");
    setResult(null);
    api.get(`/applications/track/${encodeURIComponent(n)}`)
      .then(({ data }) => setResult(data))
      .catch((e) => setError(e.response?.status === 404 ? "No application found with that number. Please check and try again." : formatApiError(e)))
      .finally(() => setBusy(false));
  };

  const statusIndex = result ? TRACK_STEPS.indexOf(result.status) : -1;
  const stepLabel = { submitted: "Application received", shortlist: "Shortlisted for admission", approved: "Admission approved — welcome!" };

  return (
    <div data-testid="track-panel" className="mt-6 rounded-3xl border border-teal-100 bg-teal-50/40 p-6">
      <button data-testid="track-toggle-button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-2.5 text-sm font-bold text-[#0F766E]">
          <Search className="h-4 w-4" /> Already applied? Track your application
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0D9488]">{open ? "Hide" : "Open"}</span>
      </button>
      {open && (
        <div className="mt-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              data-testid="track-number-input"
              className="form-input flex-1 font-mono"
              placeholder="e.g. SVN-202601-AB12"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
            <button data-testid="track-search-button" onClick={search} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F766E] px-6 py-3 text-xs font-bold text-white transition-colors hover:bg-[#0D9488] disabled:opacity-60">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />} Track status
            </button>
          </div>
          {error && <p data-testid="track-error" className="mt-3 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-[#9F1239]">{error}</p>}
          {result && (
            <div data-testid="track-result" className="mt-4 rounded-2xl border border-teal-100 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-bold text-[#9F1239]">{result.application_number}</p>
                  <p className="mt-0.5 font-display text-xl font-semibold text-[#22090F]">{result.full_name}</p>
                  <p className="text-xs text-slate-500">{result.programme} · {result.college}</p>
                </div>
                <a
                  data-testid="track-copy-download"
                  href={`${process.env.REACT_APP_BACKEND_URL}/api/applications/copy/${encodeURIComponent(result.application_number)}.pdf`}
                  className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white px-4 py-2 text-xs font-bold text-[#0F766E] transition-colors hover:bg-teal-50"
                >
                  <Download className="h-3.5 w-3.5" /> Download copy
                </a>
              </div>
              <div className="mt-5">
                {result.status === "rejected" ? (
                  <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-[#9F1239]">
                    This application was not approved. Please contact the admissions office for details.
                  </p>
                ) : (
                  <div className="flex items-center">
                    {TRACK_STEPS.map((s, i) => (
                      <div key={s} className={`flex ${i < TRACK_STEPS.length - 1 ? "flex-1" : ""} items-center`}>
                        <div className="flex flex-col items-center">
                          <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i <= statusIndex ? "bg-[#0D9488] text-white" : "bg-rose-50 text-slate-400"}`}>
                            {i <= statusIndex ? <Check className="h-4 w-4" /> : i + 1}
                          </span>
                          <span className="mt-1.5 max-w-[90px] text-center text-[10px] font-semibold text-slate-500">{stepLabel[s]}</span>
                        </div>
                        {i < TRACK_STEPS.length - 1 && <div className={`mx-2 h-0.5 flex-1 rounded ${i < statusIndex ? "bg-[#0D9488]" : "bg-rose-100"}`} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApplyPage() {
  useSEO({
    title: "Apply Online — S V College of Nursing, Bengaluru",
    description:
      "Apply for B.Sc, M.Sc or GNM Nursing at S V College of Nursing, Bengaluru. 6-step online application with document upload — save your progress and continue anytime.",
    path: "/apply",
  });
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...INITIAL, ...(parsed.form || {}) };
      }
    } catch { /* corrupt draft — start fresh */ }
    return INITIAL;
  });
  const [draftRestored, setDraftRestored] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);
  const { colleges } = useColleges();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.step) setStep(Math.min(5, Number(parsed.step) || 0));
      }
    } catch { /* ignore */ }
    setDraftRestored(true);
  }, []);

  useEffect(() => {
    if (!draftRestored || result) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, step }));
    } catch { /* storage full — ignore */ }
  }, [form, step, draftRestored, result]);

  const set = (k) => (e) => {
    const v = e && e.target ? e.target.value : e;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const digits = (s) => (s || "").split("").filter((c) => /\d/.test(c)).length;

  const activeCollege = colleges.find((c) => c.name === form.college);
  const programmeOptions = activeCollege ? activeCollege.courses.map((c) => c.name) : [];

  const validate = () => {
    const s = form;
    if (step === 0) {
      if (!s.full_name.trim()) return "Please enter the student's full name.";
      if (digits(s.mobile) < 10) return "Please enter a valid 10-digit mobile number.";
      if (!/^\S+@\S+\.\S+$/.test(s.email)) return "Please enter a valid email address.";
      if (!s.dob) return "Please enter the date of birth.";
      if (!s.gender) return "Please select a gender.";
    }
    if (step === 1) {
      if (!s.college) return "Please select a college.";
      if (!s.programme) return "Please select a programme.";
    }
    if (step === 2) {
      if (!s.address_line1.trim()) return "Address line 1 is required.";
      if (!s.city.trim()) return "City / town is required.";
      if (!s.state.trim()) return "State is required.";
      if (!/^\d{6}$/.test(s.pincode.trim())) return "Pincode must be 6 digits.";
      if (!s.guardian_name.trim()) return "Guardian's full name is required.";
      if (digits(s.guardian_mobile) < 10) return "Guardian mobile must be valid.";
    }
    if (step === 3) {
      if (!s.b10_board.trim() || !s.b10_year.trim() || !s.b10_pct.trim() || !s.b10_school.trim())
        return "All 10th standard details are required.";
      if (!s.b12_board.trim() || !s.b12_year.trim() || !s.b12_pct.trim() || !s.b12_school.trim())
        return "All 12th / PUC details are required.";
    }
    if (step === 4) {
      if (!s.payment_mode) return "Please select a payment mode.";
      if (!s.referral_source) return "Please tell us how you heard about us.";
    }
    if (step === 5) {
      if (!s.agree_accurate) return "Please confirm the information is accurate.";
      if (!s.signature.trim()) return "Please type your full name as signature.";
    }
    return "";
  };

  const next = () => {
    const err = validate();
    setError(err);
    if (!err) setStep((v) => Math.min(5, v + 1));
  };
  const back = () => {
    setError("");
    setStep((v) => Math.max(0, v - 1));
  };

  const onPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 400 / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        set("photo")(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    const err = validate();
    setError(err);
    if (err) return;
    setSubmitting(true);
    try {
      const { data } = await api.post("/applications", form);
      setResult(data);
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      window.scrollTo(0, 0);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const startNew = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setForm(INITIAL);
    setStep(0);
    setResult(null);
    setCopied(false);
    window.scrollTo(0, 0);
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(result.application_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* clipboard unavailable */ }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] px-5 py-16">
        <div data-testid="application-success-panel" className="mx-auto mt-10 max-w-2xl rounded-[2rem] border border-rose-100 bg-white p-10 text-center shadow-xl shadow-rose-100/60">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-teal-50">
            <CheckCircle2 className="h-10 w-10 text-[#0D9488]" />
          </span>
          <h1 className="mt-7 font-display text-4xl font-semibold text-[#22090F]">Application submitted!</h1>
          <p className="mt-4 text-base text-slate-600">
            Thank you, {result.full_name.split(" ")[0]}. Your application has been received by the admissions
            office, S V Group of Institutions.
          </p>
          <div className="mt-7 rounded-2xl bg-rose-50 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9F1239]">Application Number</p>
            <div className="mt-1 flex items-center justify-center gap-3">
              <p data-testid="application-number" className="font-display text-3xl font-semibold text-[#BE185D]">
                {result.application_number}
              </p>
              <button data-testid="application-copy-id-button" onClick={copyId} aria-label="Copy application number" className="rounded-full border border-rose-200 bg-white p-2 text-slate-500 transition-colors hover:border-[#BE185D] hover:text-[#BE185D]">
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">Save this reference for all future communication.</p>
          </div>

          <div className="mt-6 rounded-2xl border border-rose-100 p-6 text-left">
            <p className="font-display text-lg font-semibold text-[#22090F]">What happens next?</p>
            <ol className="mt-3 space-y-2.5">
              {[
                "You will receive a confirmation email with your application details shortly.",
                "Our admissions team will review your application and share the next steps within 3–5 working days.",
                "Selected candidates will be invited for a personal interaction / counselling session at the campus.",
                "Complete document verification and fee payment to secure your seat.",
              ].map((s, i) => (
                <li key={i} className="flex gap-3 text-[13px] leading-relaxed text-slate-600">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-50 text-[11px] font-bold text-[#BE185D]">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-5 grid gap-3 text-left sm:grid-cols-3">
            <a href="tel:+919037834632" data-testid="success-call-link" className="flex items-center gap-2.5 rounded-xl border border-rose-100 p-3 transition-colors hover:border-[#BE185D]/40">
              <Phone className="h-4 w-4 shrink-0 text-[#BE185D]" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Call</p>
                <p className="text-xs font-semibold text-[#22090F]">+91 90378 34632</p>
              </div>
            </a>
            <a href="mailto:admissions@svinstitutions.co.in" className="flex items-center gap-2.5 rounded-xl border border-rose-100 p-3 transition-colors hover:border-[#BE185D]/40">
              <Mail className="h-4 w-4 shrink-0 text-[#BE185D]" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Email</p>
                <p className="truncate text-xs font-semibold text-[#22090F]">admissions@svinstitutions.co.in</p>
              </div>
            </a>
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-100 p-3">
              <MapPin className="h-4 w-4 shrink-0 text-[#BE185D]" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Visit</p>
                <p className="text-xs font-semibold text-[#22090F]">Mallathahalli, Bengaluru</p>
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              data-testid="application-download-copy-button"
              href={`${process.env.REACT_APP_BACKEND_URL}/api/applications/copy/${encodeURIComponent(result.application_number)}.pdf`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#BE185D] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#9F1239]"
            >
              <Download className="h-4 w-4" /> Download PDF Copy
            </a>
            <button data-testid="application-start-new-button" onClick={startNew} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-rose-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 transition-colors hover:border-[#BE185D] hover:text-[#BE185D]">
              <RotateCcw className="h-4 w-4" /> Start New Application
            </button>
          </div>
          <Link
            to="/"
            data-testid="application-success-home-link"
            className="mt-4 inline-flex items-center text-xs font-bold text-slate-400 transition-colors hover:text-[#BE185D]"
          >
            ← Back to Website
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF9] pb-24">
      <header className="border-b border-rose-100 bg-white/90 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link to="/" data-testid="apply-header-home-link" className="flex items-center gap-3">
            <img src="/sv-logo.png" alt="S V logo" className="h-11 w-11 rounded-full object-cover ring-1 ring-rose-100" />
            <span>
              <span className="block font-display text-lg font-semibold leading-tight text-[#22090F]">
                S V GROUP OF INSTITUTIONS
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-700">
                Online Admissions
              </span>
            </span>
          </Link>
          <span className="hidden items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold text-[#0F766E] sm:inline-flex">
            <ShieldCheck className="h-4 w-4" /> Secure application portal
          </span>
        </div>
      </header>

      <div className="mx-auto mt-10 max-w-4xl px-5">
        <h1 className="font-display text-4xl font-semibold text-[#22090F] sm:text-5xl">Student Application Form</h1>
        <p className="mt-3 text-base text-slate-600">
          S V Group of Institutions · six quick steps · about 5 minutes
        </p>

        <TrackPanel />

        <div className="mt-8 flex items-center">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    i < step
                      ? "bg-[#0D9488] text-white"
                      : i === step
                        ? "bg-[#BE185D] text-white ring-4 ring-rose-100"
                        : "bg-white text-slate-400 ring-1 ring-rose-100"
                  }`}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className={`mt-2 hidden text-[10px] font-semibold uppercase tracking-wide sm:block ${i === step ? "text-[#BE185D]" : "text-slate-400"}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className={`mx-2 h-0.5 flex-1 rounded ${i < step ? "bg-[#0D9488]" : "bg-rose-100"}`} />}
            </div>
          ))}
        </div>

        <div data-testid="application-form-card" className="mt-8 rounded-[2rem] border border-rose-100 bg-white p-7 shadow-xl shadow-rose-100/40 sm:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              {step === 0 && (
                <>
                  <h2 className="font-display text-2xl font-semibold text-[#22090F]">Section A · Candidate Details</h2>
                  <p className="mt-1.5 text-sm text-slate-500">Fill in your personal information exactly as it appears on official documents.</p>
                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <Field label="Student Full Name" required>
                      <input data-testid="app-full-name-input" className="form-input" value={form.full_name} onChange={set("full_name")} placeholder="As per 10th marksheet" />
                    </Field>
                    <Field label="Mobile Number" required>
                      <input data-testid="app-mobile-input" className="form-input" value={form.mobile} onChange={set("mobile")} placeholder="+91 98765 43210" />
                    </Field>
                    <Field label="Email ID" required>
                      <input data-testid="app-email-input" type="email" className="form-input" value={form.email} onChange={set("email")} placeholder="you@example.com" />
                    </Field>
                    <Field label="Date of Birth" required>
                      <input data-testid="app-dob-input" type="date" className="form-input" value={form.dob} onChange={set("dob")} />
                    </Field>
                    <Field label="Gender" required>
                      <select data-testid="app-gender-select" className="form-input" value={form.gender} onChange={set("gender")}>
                        <option value="">Select gender</option>
                        {GENDERS.map((g) => <option key={g}>{g}</option>)}
                      </select>
                    </Field>
                    <Field label="Aadhaar Number">
                      <input data-testid="app-aadhaar-input" className="form-input" value={form.aadhaar} onChange={set("aadhaar")} placeholder="XXXX XXXX XXXX" />
                    </Field>
                    <Field label="Nationality">
                      <input data-testid="app-nationality-input" className="form-input" value={form.nationality} onChange={set("nationality")} />
                    </Field>
                    <Field label="Religion">
                      <input data-testid="app-religion-input" className="form-input" value={form.religion} onChange={set("religion")} placeholder="Optional" />
                    </Field>
                    <Field label="Caste / Category">
                      <input data-testid="app-caste-input" className="form-input" value={form.caste} onChange={set("caste")} placeholder="Optional" />
                    </Field>
                    <Field label="Blood Group">
                      <select data-testid="app-blood-select" className="form-input" value={form.blood_group} onChange={set("blood_group")}>
                        <option value="">Select blood group</option>
                        {BLOOD_GROUPS.map((b) => <option key={b}>{b}</option>)}
                      </select>
                    </Field>
                    <Field label="Passport-size Photograph (optional)">
                      <div className="flex items-center gap-3">
                        {form.photo ? (
                          <div className="flex items-center gap-3">
                            <img src={form.photo} alt="photo preview" className="h-14 w-14 rounded-xl object-cover ring-1 ring-rose-100" />
                            <button data-testid="app-photo-remove-button" onClick={() => set("photo")("")} className="text-xs font-bold text-[#BE185D]">
                              <X className="mr-1 inline h-3.5 w-3.5" />Remove
                            </button>
                          </div>
                        ) : (
                          <button data-testid="app-photo-upload-button" onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-3 rounded-xl border border-dashed border-rose-200 bg-[#FFFDFB] px-4 py-3 text-left text-sm text-slate-500 transition-colors hover:border-[#BE185D]">
                            <Upload className="h-4 w-4 text-[#BE185D]" /> Click to upload · JPG or PNG, up to 5 MB
                          </button>
                        )}
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
                      </div>
                    </Field>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <h2 className="font-display text-2xl font-semibold text-[#22090F]">Section B · College &amp; Course</h2>
                  <p className="mt-1.5 text-sm text-slate-500">Choose where and what you wish to study.</p>
                  <div className="mt-7 space-y-5">
                    <Field label="College" required>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {colleges.filter((c) => c.active !== false).map((c) => (
                          <button
                            key={c.id}
                            data-testid={`app-college-option-${c.id}`}
                            onClick={() => setForm((f) => ({ ...f, college: c.name, programme: "" }))}
                            className={`rounded-2xl border-2 px-5 py-4 text-left text-sm font-semibold transition-all ${
                              form.college === c.name ? "border-[#BE185D] bg-rose-50/60 text-[#22090F]" : "border-rose-100 text-slate-500 hover:border-rose-200"
                            }`}
                          >
                            {c.name}
                            {c.campus && <span className="mt-0.5 block text-[11px] font-normal text-slate-400">{c.campus}</span>}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Programme / Course" required>
                      <select data-testid="app-programme-select" className="form-input" value={form.programme} onChange={set("programme")}>
                        <option value="">{activeCollege ? "Select programme" : "Select a college first"}</option>
                        {programmeOptions.map((p) => <option key={p}>{p}</option>)}
                      </select>
                      {activeCollege && (
                        <p className="mt-2 text-[11px] text-slate-400">
                          {activeCollege.courses.map((c) => `${c.name} · ${c.duration}`).join(" · ")}
                        </p>
                      )}
                    </Field>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="Hostel Required">
                        <div className="flex gap-3">
                          {["Yes", "No"].map((o) => (
                            <button key={o} data-testid={`app-hostel-${o.toLowerCase()}`} onClick={() => set("hostel")(o)}
                              className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${form.hostel === o ? "border-[#0D9488] bg-teal-50 text-[#0F766E]" : "border-rose-100 text-slate-500"}`}>
                              {o}
                            </button>
                          ))}
                        </div>
                      </Field>
                      <Field label="Transport Required">
                        <div className="flex gap-3">
                          {["Yes", "No"].map((o) => (
                            <button key={o} data-testid={`app-transport-${o.toLowerCase()}`} onClick={() => set("transport")(o)}
                              className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${form.transport === o ? "border-[#0D9488] bg-teal-50 text-[#0F766E]" : "border-rose-100 text-slate-500"}`}>
                              {o}
                            </button>
                          ))}
                        </div>
                      </Field>
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className="font-display text-2xl font-semibold text-[#22090F]">Section C · Communication &amp; Guardian</h2>
                  <p className="mt-1.5 text-sm text-slate-500">Where can we reach you, and who should we contact in an emergency?</p>
                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Field label="Permanent / correspondence address" required>
                        <input data-testid="app-address1-input" className="form-input" value={form.address_line1} onChange={set("address_line1")} placeholder="Address line 1" />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <input data-testid="app-address2-input" className="form-input" value={form.address_line2} onChange={set("address_line2")} placeholder="Address line 2 (optional)" />
                    </div>
                    <Field label="City / Town" required>
                      <input data-testid="app-city-input" className="form-input" value={form.city} onChange={set("city")} />
                    </Field>
                    <Field label="State" required>
                      <input data-testid="app-state-input" className="form-input" value={form.state} onChange={set("state")} />
                    </Field>
                    <Field label="Pincode" required>
                      <input data-testid="app-pincode-input" className="form-input" value={form.pincode} onChange={set("pincode")} placeholder="6 digits" />
                    </Field>
                    <Field label="Guardian's Full Name" required>
                      <input data-testid="app-guardian-name-input" className="form-input" value={form.guardian_name} onChange={set("guardian_name")} />
                    </Field>
                    <Field label="Guardian Mobile" required>
                      <input data-testid="app-guardian-mobile-input" className="form-input" value={form.guardian_mobile} onChange={set("guardian_mobile")} />
                    </Field>
                    <Field label="Guardian Email">
                      <input data-testid="app-guardian-email-input" className="form-input" value={form.guardian_email} onChange={set("guardian_email")} />
                    </Field>
                    <Field label="Guardian Occupation">
                      <input data-testid="app-guardian-occupation-input" className="form-input" value={form.guardian_occupation} onChange={set("guardian_occupation")} />
                    </Field>
                    <Field label="Emergency Contact Name">
                      <input data-testid="app-emergency-name-input" className="form-input" value={form.emergency_name} onChange={set("emergency_name")} />
                    </Field>
                    <Field label="Emergency Mobile">
                      <input data-testid="app-emergency-mobile-input" className="form-input" value={form.emergency_mobile} onChange={set("emergency_mobile")} />
                    </Field>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <h2 className="font-display text-2xl font-semibold text-[#22090F]">Section D · Academic Record</h2>
                  <p className="mt-1.5 text-sm text-slate-500">Your qualifying examination details.</p>
                  <p className="mt-7 text-xs font-bold uppercase tracking-[0.12em] text-[#BE185D]">10th Standard / SSLC</p>
                  <div className="mt-3 grid gap-5 sm:grid-cols-2">
                    <Field label="Board" required><input data-testid="app-10-board-input" className="form-input" value={form.b10_board} onChange={set("b10_board")} /></Field>
                    <Field label="Year of Passing" required><input data-testid="app-10-year-input" className="form-input" value={form.b10_year} onChange={set("b10_year")} placeholder="e.g. 2019" /></Field>
                    <Field label="Percentage / CGPA" required><input data-testid="app-10-pct-input" className="form-input" value={form.b10_pct} onChange={set("b10_pct")} /></Field>
                    <Field label="School Name" required><input data-testid="app-10-school-input" className="form-input" value={form.b10_school} onChange={set("b10_school")} /></Field>
                  </div>
                  <div className="mt-5">
                    <FileUpload label="10th Marksheet / SSLC (optional)" testid="app-marksheet10-upload" value={form.marksheet10} onChange={set("marksheet10")} />
                  </div>
                  <p className="mt-8 text-xs font-bold uppercase tracking-[0.12em] text-[#BE185D]">12th / PUC / Equivalent</p>
                  <div className="mt-3 grid gap-5 sm:grid-cols-2">
                    <Field label="Board" required><input data-testid="app-12-board-input" className="form-input" value={form.b12_board} onChange={set("b12_board")} /></Field>
                    <Field label="Year of Passing" required><input data-testid="app-12-year-input" className="form-input" value={form.b12_year} onChange={set("b12_year")} /></Field>
                    <Field label="Stream"><input data-testid="app-12-stream-input" className="form-input" value={form.b12_stream} onChange={set("b12_stream")} placeholder="Science / Arts / Commerce" /></Field>
                    <Field label="Percentage / CGPA" required><input data-testid="app-12-pct-input" className="form-input" value={form.b12_pct} onChange={set("b12_pct")} /></Field>
                    <div className="sm:col-span-2">
                      <Field label="School / College Name" required><input data-testid="app-12-school-input" className="form-input" value={form.b12_school} onChange={set("b12_school")} /></Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Diploma, certifications or other examinations (optional)">
                        <textarea data-testid="app-other-qualification-input" rows={2} className="form-input resize-none" value={form.other_qualification} onChange={set("other_qualification")} />
                      </Field>
                    </div>
                  </div>
                  <div className="mt-5">
                    <FileUpload label="12th Marksheet / PUC (optional)" testid="app-marksheet12-upload" value={form.marksheet12} onChange={set("marksheet12")} />
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <h2 className="font-display text-2xl font-semibold text-[#22090F]">Section E · Payment &amp; Reference</h2>
                  <p className="mt-1.5 text-sm text-slate-500">
                    If you have already paid the application fee, share the payment details so our office can
                    verify it. You may also pay at the campus office.
                  </p>
                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <Field label="Payment Mode" required>
                      <select data-testid="app-payment-mode-select" className="form-input" value={form.payment_mode} onChange={set("payment_mode")}>
                        <option value="">Select mode</option>
                        {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
                      </select>
                    </Field>
                    <Field label="Reference (UPI / Bank UTR / Cheque no.)">
                      <input data-testid="app-payment-ref-input" className="form-input" value={form.payment_reference} onChange={set("payment_reference")} />
                    </Field>
                    <Field label="Paid To (Receiver name)">
                      <input data-testid="app-payment-receiver-input" className="form-input" value={form.payment_receiver} onChange={set("payment_receiver")} />
                    </Field>
                    <Field label="How did you hear about us?" required>
                      <select data-testid="app-referral-select" className="form-input" value={form.referral_source} onChange={set("referral_source")}>
                        <option value="">Select an option</option>
                        {REFERRALS.map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Remarks">
                        <textarea data-testid="app-payment-remarks-input" rows={2} className="form-input resize-none" value={form.payment_remarks} onChange={set("payment_remarks")} placeholder="Anything else the admissions office should know" />
                      </Field>
                    </div>
                  </div>
                </>
              )}

              {step === 5 && (
                <>
                  <h2 className="font-display text-2xl font-semibold text-[#22090F]">Section F · Declaration</h2>
                  <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/50 p-6">
                    <p className="text-sm leading-relaxed text-slate-600">
                      I declare that the information provided in this application is true, complete and correct
                      to the best of my knowledge and belief. I understand that admission is subject to
                      verification of documents and eligibility as per the university and council norms, and
                      that furnishing false information may lead to cancellation of admission.
                    </p>
                    <label className="mt-5 flex items-start gap-3 text-sm font-semibold text-[#22090F]">
                      <input
                        data-testid="app-agree-accurate-checkbox"
                        type="checkbox"
                        checked={form.agree_accurate}
                        onChange={(e) => setForm((f) => ({ ...f, agree_accurate: e.target.checked }))}
                        className="mt-0.5 h-4 w-4 accent-[#BE185D]"
                      />
                      I confirm that the information provided is accurate.
                    </label>
                    <label className="mt-3 flex items-start gap-3 text-sm font-semibold text-[#22090F]">
                      <input
                        data-testid="app-agree-communication-checkbox"
                        type="checkbox"
                        checked={form.agree_communication}
                        onChange={(e) => setForm((f) => ({ ...f, agree_communication: e.target.checked }))}
                        className="mt-0.5 h-4 w-4 accent-[#BE185D]"
                      />
                      I consent to be contacted by the institution regarding my application (call, SMS, email or WhatsApp).
                    </label>
                  </div>
                  <div className="mt-6">
                    <Field label="Signature — type your full name" required>
                      <input data-testid="app-signature-input" className="form-input font-display text-xl italic" value={form.signature} onChange={set("signature")} placeholder="Your full name" />
                    </Field>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {error && (
            <p data-testid="app-error-alert" className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-[#9F1239]">
              {error}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-rose-100 pt-6">
            {step > 0 ? (
              <button data-testid="app-back-button" onClick={back} className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-6 py-3 text-sm font-semibold text-slate-600 transition-colors hover:border-[#BE185D] hover:text-[#BE185D]">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              <p className="text-xs text-slate-400 sm:max-w-xs">Your progress is saved automatically on this device.</p>
            )}
            {step < 5 ? (
              <button data-testid="app-continue-button" onClick={next} className="group inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-rose-900/20 transition-all hover:bg-[#9F1239]">
                Continue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : (
              <button data-testid="app-submit-application-button" onClick={submit} disabled={submitting} className="inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-rose-900/20 transition-all hover:bg-[#9F1239] disabled:opacity-60">
                {submitting ? "Submitting..." : <>Submit Application <Check className="h-4 w-4" /></>}
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} S V Group of Institutions, Bengaluru. All rights reserved.
        </p>
      </div>
    </div>
  );
}
