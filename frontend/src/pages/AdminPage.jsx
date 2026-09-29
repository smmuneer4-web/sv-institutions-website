import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Search, X, MessageCircle, Mail, Trash2, FileText, Download } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { useLenisStop } from "@/lib/scroll";

const STATUSES = ["submitted", "shortlist", "approved", "rejected"];

const STATUS_STYLE = {
  submitted: "bg-slate-100 text-slate-600",
  shortlist: "bg-teal-50 text-[#0F766E]",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-[#9F1239]",
};

const initials = (s) => (s || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso || "—";
  }
};
const waLink = (phone) => {
  const d = (phone || "").split("").filter((c) => /\d/.test(c)).join("");
  const n = d.length === 10 ? `91${d}` : d;
  return `https://wa.me/${n}`;
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

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [apps, setApps] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/auth/me")
      .then(({ data }) => setUser(data))
      .catch(() => setUser(false));
  }, []);

  const loadApps = () => {
    api.get("/applications")
      .then(({ data }) => setApps(data))
      .catch((e) => setError(formatApiError(e)));
  };

  useEffect(() => {
    if (user) loadApps();
  }, [user]);

  if (user === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFDF9]">
        <p className="animate-pulse font-display text-2xl text-[#9F1239]">Loading dashboard…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFDF9] px-5">
        <div data-testid="admin-login-card" className="w-full max-w-md rounded-[2rem] border border-rose-100 bg-white p-9 shadow-xl shadow-rose-100/50">
          <div className="flex items-center gap-3">
            <img src="/sv-logo.png" alt="S V logo" className="h-12 w-12 rounded-full object-cover ring-1 ring-rose-100" />
            <div>
              <p className="font-display text-xl font-semibold text-[#22090F]">S V GROUP OF INSTITUTIONS</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-700">Admissions Dashboard</p>
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

  const counts = {
    all: apps.length,
    submitted: apps.filter((a) => a.status === "submitted").length,
    shortlist: apps.filter((a) => a.status === "shortlist").length,
    approved: apps.filter((a) => a.status === "approved").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  };
  const filtered = apps
    .filter((a) => filter === "all" || a.status === filter)
    .filter((a) =>
      [a.full_name, a.mobile, a.application_number, a.programme].join(" ").toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="min-h-screen bg-[#F8F5F2]">
      <header className="border-b border-rose-100 bg-white px-5 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/sv-logo.png" alt="S V logo" className="h-11 w-11 rounded-full object-cover ring-1 ring-rose-100" />
            <div>
              <p className="font-display text-lg font-semibold leading-tight text-[#22090F]">S V GROUP OF INSTITUTIONS</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-700">Admissions Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" data-testid="admin-back-to-site-link" className="hidden text-xs font-bold text-slate-500 hover:text-[#BE185D] sm:inline">
              View Website
            </a>
            <button
              data-testid="admin-logout-button"
              onClick={async () => {
                await api.post("/auth/logout").catch(() => {});
                setUser(false);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-5 py-2.5 text-xs font-bold text-[#9F1239] transition-colors hover:bg-rose-50"
            >
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[
            { label: "Total", v: counts.all, testid: "stat-total" },
            { label: "Submitted", v: counts.submitted, testid: "stat-submitted" },
            { label: "Shortlisted", v: counts.shortlist, testid: "stat-shortlisted" },
            { label: "Approved", v: counts.approved, testid: "stat-approved" },
            { label: "Rejected", v: counts.rejected, testid: "stat-rejected" },
          ].map((s) => (
            <div key={s.label} data-testid={s.testid} className="rounded-2xl border border-rose-100 bg-white p-5">
              <p className="font-display text-4xl font-semibold text-[#22090F]">{s.v}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {["all", ...STATUSES].map((s) => (
              <button
                key={s}
                data-testid={`admin-filter-${s}`}
                onClick={() => setFilter(s)}
                className={`rounded-full px-4 py-2 text-xs font-bold capitalize transition-all ${
                  filter === s ? "bg-[#BE185D] text-white shadow-md shadow-rose-200" : "bg-white text-slate-500 ring-1 ring-rose-100 hover:text-[#BE185D]"
                }`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="relative sm:w-72">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              data-testid="admin-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, mobile, application no..."
              className="form-input pl-11"
            />
          </div>
        </div>

        {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-[#9F1239]">{error}</p>}

        <div className="mt-6 overflow-hidden rounded-3xl border border-rose-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-rose-100 bg-rose-50/40 text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
                <th className="px-5 py-4">Applicant</th>
                <th className="hidden px-5 py-4 md:table-cell">Programme</th>
                <th className="hidden px-5 py-4 lg:table-cell">Mobile</th>
                <th className="hidden px-5 py-4 sm:table-cell">Date</th>
                <th className="px-5 py-4">Status</th>
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
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {a.photo ? (
                        <img src={a.photo} alt="" className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-xs font-bold text-[#BE185D]">
                          {initials(a.full_name)}
                        </span>
                      )}
                      <div>
                        <p className="font-semibold text-[#22090F]">{a.full_name}</p>
                        <p className="text-xs text-slate-400">{a.application_number}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-5 py-4 text-slate-600 md:table-cell">
                    {a.programme}
                    <span className="block text-xs text-slate-400">{a.college}</span>
                  </td>
                  <td className="hidden px-5 py-4 text-slate-600 lg:table-cell">{a.mobile}</td>
                  <td className="hidden px-5 py-4 text-slate-600 sm:table-cell">{fmtDate(a.created_at)}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${STATUS_STYLE[a.status] || "bg-slate-100 text-slate-600"}`}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center text-sm text-slate-400">
                    No applications found. New applications from the portal will appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
