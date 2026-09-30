import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Search, X, MessageCircle, Mail, Trash2, RefreshCw, ExternalLink, ChevronRight, Check } from "lucide-react";
import { api, formatApiError, saveAuth, clearAuth } from "../lib/api";
import { inr, collected } from "../lib/admin";
import { useLenisStop } from "../lib/scroll";

const STATUSES = ["submitted", "shortlist", "approved", "rejected"];
const COLLEGES = ["S V College of Nursing", "D R Vijayakumari School of Nursing"];

const STATUS_STYLE = {
  submitted: "bg-slate-100 text-slate-600",
  shortlist: "bg-teal-50 text-[#0F766E]",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-[#9F1239]",
};
const STATUS_LABEL = { submitted: "Submitted", shortlist: "Shortlisted", approved: "Approved", rejected: "Rejected" };

const initials = (s) => (s || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso || "—";
  }
};
const isToday = (iso) => {
  try {
    return new Date(iso).toDateString() === new Date().toDateString();
  } catch {
    return false;
  }
};
const waLink = (phone) => {
  const d = (phone || "").split("").filter((c) => /\d/.test(c)).join("");
  return `https://wa.me/${d.length === 10 ? `91${d}` : d}`;
};

const Row = ({ label, value }) => (
  <div className="flex justify-between gap-4 border-b border-rose-50 py-2 text-sm last:border-0">
    <span className="shrink-0 font-semibold text-slate-400">{label}</span>
    <span className="text-right font-medium text-[#22090F]">{value === "" || value == null ? "—" : String(value)}</span>
  </div>
);

function DetailModal({ app: a, onClose, onSaved, onDeleted }) {
  useLenisStop(true);
  const [status, setStatus] = useState(a.status);
  const [notes, setNotes] = useState(a.admin_notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const { data } = await api.patch(`/applications/${a.id}`, { status, admin_notes: notes });
      onSaved(data);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!window.confirm(`Delete application ${a.application_number}? This cannot be undone.`)) return;
    try {
      await api.delete(`/applications/${a.id}`);
      onDeleted();
    } catch (e) {
      setError(formatApiError(e));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#22090F]/70 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        data-testid="admin-detail-modal"
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4 bg-[#6E0A28] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            {a.photo ? (
              <img src={a.photo} alt="student" className="h-11 w-11 rounded-full object-cover ring-2 ring-white/30" />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 font-display text-lg">
                {initials(a.full_name)}
              </span>
            )}
            <div>
              <p className="font-display text-xl font-semibold">{a.full_name}</p>
              <p className="text-xs text-white/70">{a.application_number} · {fmtDate(a.created_at)}</p>
            </div>
          </div>
          <button data-testid="admin-detail-close-button" onClick={onClose} aria-label="Close" className="rounded-full border border-white/25 p-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div data-lenis-prevent className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${STATUS_STYLE[a.status] || "bg-slate-100"}`}>{a.status}</span>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-[#9F1239]">{a.programme}</span>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-[#0F766E]">{a.college}</span>
            {a.hostel === "Yes" && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">Hostel</span>}
            {a.transport === "Yes" && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">Transport</span>}
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              data-testid="admin-whatsapp-student-link"
              href={waLink(a.mobile)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Student
            </a>
            {a.guardian_mobile && (
              <a
                data-testid="admin-whatsapp-guardian-link"
                href={waLink(a.guardian_mobile)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Guardian
              </a>
            )}
            {a.email && (
              <a
                data-testid="admin-email-link"
                href={`mailto:${a.email}`}
                className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-xs font-bold text-[#9F1239] transition-colors hover:bg-rose-100"
              >
                <Mail className="h-3.5 w-3.5" /> Email Student
              </a>
            )}
          </div>

          {[
            { t: "Basic Info", rows: [["Mobile", a.mobile], ["Email", a.email], ["Date of Birth", a.dob], ["Gender", a.gender], ["Aadhaar", a.aadhaar], ["Nationality", a.nationality], ["Religion / Caste", [a.religion, a.caste].filter(Boolean).join(" · ")], ["Blood Group", a.blood_group]] },
            { t: "Communication & Guardian", rows: [["Address", [a.address_line1, a.address_line2].filter(Boolean).join(", ")], ["City", a.city], ["State", a.state], ["Pincode", a.pincode], ["Guardian", a.guardian_name], ["Guardian Mobile", a.guardian_mobile], ["Guardian Email", a.guardian_email], ["Guardian Occupation", a.guardian_occupation], ["Emergency", [a.emergency_name, a.emergency_mobile].filter(Boolean).join(" · ")]] },
            { t: "Academic Record", rows: [["10th — Board / Year", [a.b10_board, a.b10_year].filter(Boolean).join(" / ")], ["10th — % / School", [a.b10_pct, a.b10_school].filter(Boolean).join(" · ")], ["12th — Board / Year", [a.b12_board, a.b12_year].filter(Boolean).join(" / ")], ["12th — Stream / %", [a.b12_stream, a.b12_pct].filter(Boolean).join(" / ")], ["12th — School", a.b12_school], ["Other Qualifications", a.other_qualification]] },
            { t: "Payment & Reference", rows: [["Payment Mode", a.payment_mode], ["Reference", a.payment_reference], ["Paid To", a.payment_receiver], ["Referral Source", a.referral_source], ["Remarks", a.payment_remarks]] },
            { t: "Declaration", rows: [["Confirmed Accurate", a.agree_accurate ? "Yes" : "No"], ["Consent to Communication", a.agree_communication ? "Yes" : "No"], ["Signature", a.signature]] },
          ].map((sec) => (
            <div key={sec.t} className="rounded-2xl border border-rose-100 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#BE185D]">{sec.t}</p>
              <div className="mt-2">
                {sec.rows.map(([label, value]) => (
                  <Row key={label} label={label} value={value} />
                ))}
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0F766E]">Admin Actions</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Status</label>
                <select data-testid="admin-status-select" className="form-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Admin Notes</label>
                <textarea data-testid="admin-notes-input" rows={2} className="form-input resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes..." />
              </div>
            </div>
            {error && <p data-testid="admin-detail-error" className="mt-3 rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-[#9F1239]">{error}</p>}
            <div className="mt-4 flex items-center justify-between">
              <button
                data-testid="admin-delete-application-button"
                onClick={del}
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-xs font-bold text-[#9F1239] transition-colors hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Application
              </button>
              <button
                data-testid="admin-save-application-button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-6 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#9F1239] disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EnquiryDeleteButton({ id, onDeleted }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      data-testid={`admin-enquiry-delete-button-${id}`}
      disabled={busy}
      onClick={async () => {
        if (!window.confirm("Delete this enquiry? This cannot be undone.")) return;
        setBusy(true);
        try {
          await api.delete(`/enquiries/${id}`);
          onDeleted();
        } finally {
          setBusy(false);
        }
      }}
      aria-label="Delete enquiry"
      className="rounded-full p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-[#9F1239] disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

function PaymentCell({ app: a, onUpdated }) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
      <input
        data-testid={`payment-amount-input-${a.application_number}`}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Rs"
        inputMode="numeric"
        className="w-20 rounded-lg border border-rose-100 bg-[#FFFDFB] px-2.5 py-1.5 text-right text-xs font-semibold outline-none transition-all focus:border-[#BE185D]"
      />
      <button
        data-testid={`payment-submit-button-${a.application_number}`}
        disabled={busy}
        onClick={async () => {
          setErr("");
          const amt = Number(amount);
          if (!amt || amt <= 0) {
            setErr("Enter an amount");
            return;
          }
          setBusy(true);
          try {
            const { data } = await api.post(`/applications/${a.id}/payments`, { amount: amt });
            setAmount("");
            onUpdated(data);
          } catch (e) {
            setErr(formatApiError(e));
          } finally {
            setBusy(false);
          }
        }}
        aria-label={`Record payment for ${a.full_name}`}
        title="Record this payment"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#BE185D] text-white transition-all hover:bg-[#9F1239] disabled:opacity-50"
      >
        {busy ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Check className="h-3.5 w-3.5" />}
      </button>
      {err && <span data-testid={`payment-error-${a.application_number}`} className="mt-1 text-[10px] font-bold text-[#9F1239]">{err}</span>}
    </div>
  );
}

const StatCard = ({ label, value, sub, testid }) => (
  <div data-testid={testid} className="rounded-2xl border border-rose-100 bg-white p-6">
    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
    <p className="mt-3 font-display text-5xl font-semibold leading-none text-[#22090F]">{value}</p>
    <p className="mt-2 text-xs text-slate-400">{sub}</p>
  </div>
);

const BreakdownPanel = ({ title, sub, rows, testid }) => {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div data-testid={testid} className="rounded-2xl border border-rose-100 bg-white p-6">
      <p className="text-sm font-bold text-[#22090F]">{title}</p>
      <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
      <div className="mt-5 space-y-3.5">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500">{r.label}</span>
              <span className="text-[#22090F]">{r.count}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-rose-50">
              <div
                className={`h-full rounded-full ${r.color || "bg-[#BE185D]"}`}
                style={{ width: `${(r.count / max) * 100}%`, transition: "width .6s cubic-bezier(.16,1,.3,1)" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("applications");
  const [apps, setApps] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [collegeFilter, setCollegeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/auth/me")
      .then(({ data }) => setUser(data))
      .catch(() => setUser(false));
  }, []);

  const loadApps = () =>
    api.get("/applications")
      .then(({ data }) => setApps(data))
      .catch((e) => setError(formatApiError(e)));

  const loadEnquiries = () =>
    api.get("/enquiries")
      .then(({ data }) => setEnquiries(data))
      .catch((e) => setError(formatApiError(e)));

  const refreshAll = () => {
    setRefreshing(true);
    setError("");
    Promise.all([loadApps(), loadEnquiries()]).finally(() => setRefreshing(false));
  };

  useEffect(() => {
    if (user) refreshAll();
  }, [user]);

  if (user === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F5F2]">
        <p className="animate-pulse font-display text-2xl text-[#9F1239]">Loading console…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F5F2] px-5">
        <div data-testid="admin-login-card" className="w-full max-w-md rounded-[2rem] border border-rose-100 bg-white p-9 shadow-xl shadow-rose-100/50">
          <div className="flex items-center gap-3">
            <img src="/sv-logo.png" alt="S V logo" className="h-12 w-12 rounded-full object-cover ring-1 ring-rose-100" />
            <div>
              <p className="font-display text-xl font-semibold text-[#22090F]">S V GROUP OF INSTITUTIONS</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-700">Admissions Console</p>
            </div>
          </div>
          <h1 className="mt-7 font-display text-3xl font-semibold text-[#22090F]">Admin Login</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in with your admissions office credentials.</p>
          <form
            className="mt-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              try {
                const { data } = await api.post("/auth/login", {
                  email: e.target.email.value,
                  password: e.target.password.value,
                });
                saveAuth(data);
                setUser(data);
              } catch (err) {
                setError(formatApiError(err));
              }
            }}
          >
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Email</label>
              <input data-testid="admin-login-email-input" name="email" type="email" className="form-input" placeholder="admin@svinstitutions.co.in" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Password</label>
              <input data-testid="admin-login-password-input" name="password" type="password" className="form-input" placeholder="••••••••" />
            </div>
            {error && <p data-testid="admin-login-error" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-[#9F1239]">{error}</p>}
            <button data-testid="admin-login-submit-button" type="submit" className="w-full rounded-full bg-[#BE185D] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-900/20 transition-colors hover:bg-[#9F1239]">
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  const todayCount = apps.filter((a) => isToday(a.created_at)).length;
  const filtered = apps
    .filter((a) => statusFilter === "all" || a.status === statusFilter)
    .filter((a) => collegeFilter === "all" || a.college === collegeFilter)
    .filter((a) =>
      [a.full_name, a.mobile, a.application_number, a.programme].join(" ").toLowerCase().includes(search.toLowerCase())
    );
  const filteredEnquiries = enquiries.filter((e) =>
    [e.name, e.phone, e.email, e.program, e.city].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const statusBreakdown = STATUSES.map((s) => ({
    label: STATUS_LABEL[s],
    count: apps.filter((a) => a.status === s).length,
    color: s === "shortlist" ? "bg-[#0D9488]" : s === "approved" ? "bg-emerald-500" : s === "rejected" ? "bg-rose-400" : "bg-[#BE185D]",
  }));
  const collegeBreakdown = COLLEGES.map((c) => ({
    label: c,
    count: apps.filter((a) => a.college === c).length,
    color: c === COLLEGES[0] ? "bg-[#BE185D]" : "bg-[#0D9488]",
  }));
  const programmeBreakdown = ["B.Sc. Nursing", "M.Sc. Nursing", "GNM (DGNM)"].map((p) => ({
    label: p,
    count: apps.filter((a) => a.programme === p).length,
    color: "bg-[#9F1239]",
  }));

  return (
    <div className="min-h-screen bg-[#F8F5F2]">
      <header className="border-b border-rose-100 bg-white px-5 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/sv-logo.png" alt="S V logo" className="h-12 w-12 rounded-full object-cover ring-1 ring-rose-100" />
            <div>
              <p className="font-display text-xl font-semibold leading-tight text-[#22090F]">Admissions Console</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-700">S V Group of Institutions, Bengaluru</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-xs font-bold text-[#0F766E] sm:inline-flex">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#0D9488]" /> Admin session · {user.email}
            </span>
            <a href="/admin/students" data-testid="admin-students-page-link" className="hidden text-xs font-bold text-slate-500 hover:text-[#BE185D] sm:inline">
              Students &amp; Fees
            </a>
            <a href="/" data-testid="admin-back-to-site-link" className="hidden text-xs font-bold text-slate-500 hover:text-[#BE185D] sm:inline">
              View Website
            </a>
            <button
              data-testid="admin-logout-button"
              onClick={async () => {
                await api.post("/auth/logout").catch(() => {});
                clearAuth();
                setUser(false);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-5 py-2.5 text-xs font-bold text-[#9F1239] transition-colors hover:bg-rose-50"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-semibold text-[#22090F]">
              {tab === "applications" ? "Applications Overview" : "Enquiries"}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {tab === "applications"
                ? "Manage admissions applications across all colleges."
                : "Quick enquiries submitted from the website form."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              data-testid="admin-refresh-button"
              onClick={refreshAll}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:border-[#BE185D] hover:text-[#BE185D]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
            </button>
            {tab === "applications" && (
              <button
                data-testid="admin-new-application-button"
                onClick={() => window.open("/apply", "_blank")}
                className="inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-200 transition-all hover:bg-[#9F1239]"
              >
                New Application <ExternalLink className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            data-testid="admin-tab-applications"
            onClick={() => setTab("applications")}
            className={`rounded-full px-5 py-2.5 text-xs font-bold transition-all ${tab === "applications" ? "bg-[#BE185D] text-white shadow-md shadow-rose-200" : "bg-white text-slate-500 ring-1 ring-rose-100 hover:text-[#BE185D]"}`}
          >
            Applications ({apps.length})
          </button>
          <button
            data-testid="admin-tab-enquiries"
            onClick={() => setTab("enquiries")}
            className={`rounded-full px-5 py-2.5 text-xs font-bold transition-all ${tab === "enquiries" ? "bg-[#BE185D] text-white shadow-md shadow-rose-200" : "bg-white text-slate-500 ring-1 ring-rose-100 hover:text-[#BE185D]"}`}
          >
            Enquiries ({enquiries.length})
          </button>
        </div>

        {tab === "applications" && (
          <>
            <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Total Applications" value={apps.length} sub="Across 2 colleges" testid="stat-total" />
              <StatCard label="Today" value={todayCount} sub="Received today" testid="stat-today" />
              <StatCard label="Shortlisted" value={statusBreakdown[1].count} sub="Pending action" testid="stat-shortlisted" />
              <StatCard label="Approved" value={statusBreakdown[2].count} sub="Confirmed seats" testid="stat-approved" />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <BreakdownPanel title="Status Breakdown" sub="Applications by current status" rows={statusBreakdown} testid="panel-status-breakdown" />
              <BreakdownPanel title="Applications by College" sub="Distribution across colleges" rows={collegeBreakdown} testid="panel-college-breakdown" />
              <BreakdownPanel title="Programme Interest" sub="Choice of nursing programme" rows={programmeBreakdown} testid="panel-programme-breakdown" />
            </div>

            <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <select data-testid="admin-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-input w-auto pr-8 text-sm font-semibold">
                  <option value="all">All statuses</option>
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
                <select data-testid="admin-college-filter" value={collegeFilter} onChange={(e) => setCollegeFilter(e.target.value)} className="form-input w-auto pr-8 text-sm font-semibold">
                  <option value="all">All colleges</option>
                  {COLLEGES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="relative lg:w-80">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  data-testid="admin-search-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search candidate, mobile, application no..."
                  className="form-input pl-11"
                />
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-rose-100 bg-white">
              <div className="flex items-center justify-between border-b border-rose-100 px-6 py-4">
                <p className="text-sm font-bold text-[#22090F]">Applications</p>
                <p data-testid="admin-table-count" className="text-xs font-semibold text-slate-400">{filtered.length} of {apps.length}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-rose-100 bg-rose-50/40 text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
                      <th className="px-6 py-4">Application ID</th>
                      <th className="px-6 py-4">Candidate</th>
                      <th className="px-6 py-4">Programme</th>
                      <th className="px-6 py-4">Contact</th>
                      <th className="px-6 py-4">Submitted</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Record Payment</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => (
                      <tr
                        key={a.id}
                        data-testid={`admin-application-row-${a.application_number}`}
                        onClick={() => setSelected(a)}
                        className="cursor-pointer border-b border-rose-50 transition-colors last:border-0 hover:bg-rose-50/40"
                      >
                        <td className="px-6 py-4 font-mono text-xs font-semibold text-[#9F1239]">{a.application_number}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {a.photo ? (
                              <img src={a.photo} alt="" className="h-9 w-9 rounded-full object-cover" />
                            ) : (
                              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-xs font-bold text-[#BE185D]">
                                {initials(a.full_name)}
                              </span>
                            )}
                            <span className="font-semibold text-[#22090F]">{a.full_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {a.programme}
                          <span className="block text-xs text-slate-400">{a.college}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {a.mobile}
                          <span className="block text-xs text-slate-400">{a.city}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{fmtDate(a.created_at)}</td>
                        <td className="px-6 py-4">
                          <span data-testid={`application-amount-${a.application_number}`} className="font-semibold text-emerald-700">
                            {inr(collected(a))}
                          </span>
                          <span className="block text-[10px] text-slate-400">of {inr(a.fee_total)} plan</span>
                        </td>
                        <td className="relative px-4 py-4">
                          <PaymentCell app={a} onUpdated={(updated) => setApps((list) => list.map((x) => (x.id === updated.id ? updated : x)))} />
                        </td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${STATUS_STYLE[a.status] || "bg-slate-100 text-slate-600"}`}>
                            {STATUS_LABEL[a.status] || a.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <ChevronRight className="ml-auto h-4 w-4 text-slate-300" />
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-6 py-16 text-center text-sm text-slate-400">
                          No applications yet.
                          <span className="block">Applications will appear here as students apply.</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === "enquiries" && (
          <div className="mt-5 overflow-hidden rounded-3xl border border-rose-100 bg-white">
            <div className="flex items-center justify-between border-b border-rose-100 px-6 py-4">
              <p className="text-sm font-bold text-[#22090F]">Website Enquiries</p>
              <p data-testid="admin-enquiry-count" className="text-xs font-semibold text-slate-400">{filteredEnquiries.length} of {enquiries.length}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-rose-100 bg-rose-50/40 text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
                    <th className="px-6 py-4">Candidate</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Interest</th>
                    <th className="px-6 py-4">Message</th>
                    <th className="px-6 py-4">Received</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnquiries.map((e) => (
                    <tr key={e.id} data-testid={`admin-enquiry-row-${e.id}`} className="border-b border-rose-50 transition-colors last:border-0 hover:bg-rose-50/30">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-[#0F766E]">
                            {initials(e.name)}
                          </span>
                          <div>
                            <p className="font-semibold text-[#22090F]">{e.name}</p>
                            {e.city && <p className="text-xs text-slate-400">{e.city}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {e.phone}
                        <span className="block text-xs text-slate-400">{e.email}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {e.program}
                        <span className="block text-xs text-slate-400">{e.college}</span>
                      </td>
                      <td className="max-w-[16rem] px-6 py-4 text-slate-600">
                        <span className="line-clamp-2 text-xs">{e.message || "—"}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{fmtDate(e.created_at)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            data-testid={`admin-enquiry-whatsapp-${e.id}`}
                            href={waLink(e.phone)}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="WhatsApp"
                            className="rounded-full p-2 text-emerald-600 transition-colors hover:bg-emerald-50"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                          <a
                            data-testid={`admin-enquiry-email-${e.id}`}
                            href={`mailto:${e.email}`}
                            aria-label="Email"
                            className="rounded-full p-2 text-[#BE185D] transition-colors hover:bg-rose-50"
                          >
                            <Mail className="h-4 w-4" />
                          </a>
                          <EnquiryDeleteButton
                            id={e.id}
                            onDeleted={() => setEnquiries((list) => list.filter((x) => x.id !== e.id))}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredEnquiries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-sm text-slate-400">
                        No enquiries yet.
                        <span className="block">Enquiries from the website form will appear here.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {selected && (
          <DetailModal
            app={selected}
            onClose={() => setSelected(null)}
            onSaved={(updated) => {
              setApps((list) => list.map((a) => (a.id === updated.id ? updated : a)));
              setSelected(null);
            }}
            onDeleted={() => {
              setApps((list) => list.filter((a) => a.id !== selected.id));
              setSelected(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
