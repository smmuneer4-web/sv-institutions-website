import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Mail, Trash2, Plus, Check } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { useAdminAuth, Topbar, STATUS_STYLE, STATUS_LABEL, initials, fmtDate, inr, collected, waLink } from "../lib/admin";

const Row = ({ label, value }) => (
  <div className="flex justify-between gap-4 border-b border-rose-50 py-2 text-sm last:border-0">
    <span className="shrink-0 font-semibold text-slate-400">{label}</span>
    <span className="text-right font-medium text-[#22090F]">{value === "" || value == null ? "—" : String(value)}</span>
  </div>
);

export default function StudentDetailPage() {
  const { ref } = useParams();
  const navigate = useNavigate();
  const [user] = useAdminAuth();
  const [app, setApp] = useState(null);
  const [missing, setMissing] = useState(false);
  const [plan, setPlan] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payRef, setPayRef] = useState("");
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    api.get(`/applications/by-number/${ref}`)
      .then(({ data }) => {
        setApp(data);
        setPlan(data.fee_total ? String(data.fee_total) : "");
        setStatus(data.status);
        setNotes(data.admin_notes || "");
      })
      .catch(() => setMissing(true));
  }, [user, ref]);

  if (user === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F5F2]">
        <p className="animate-pulse font-display text-2xl text-[#9F1239]">Loading console…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/admin" replace />;

  if (missing || !app) {
    return (
      <div className="min-h-screen bg-[#F8F5F2]">
        <Topbar user={user} active="students" />
        <div className="mx-auto max-w-3xl px-5 py-20 text-center">
          <p className="font-display text-3xl text-[#22090F]">Application not found</p>
          <Link to="/admin/students" data-testid="student-detail-back-link" className="mt-6 inline-flex rounded-full bg-[#BE185D] px-6 py-3 text-sm font-bold text-white">
            Back to Students
          </Link>
        </div>
      </div>
    );
  }

  const save = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const savePlan = () =>
    save(async () => {
      const { data } = await api.patch(`/applications/${app.id}/fees`, { fee_total: Number(plan || 0) });
      setApp(data);
    });

  const addPayment = () =>
    save(async () => {
      if (!payAmount || Number(payAmount) <= 0) {
        setError("Enter a payment amount greater than zero.");
        return;
      }
      const { data } = await api.post(`/applications/${app.id}/payments`, { amount: Number(payAmount), reference: payRef });
      setApp(data);
      setPayAmount("");
      setPayRef("");
    });

  const saveStatus = () =>
    save(async () => {
      const { data } = await api.patch(`/applications/${app.id}`, { status, admin_notes: notes });
      setApp(data);
    });

  const del = () =>
    save(async () => {
      if (!window.confirm(`Delete application ${app.application_number}? This cannot be undone.`)) return;
      await api.delete(`/applications/${app.id}`);
      navigate("/admin/students");
    });

  const balance = Number(app.fee_total || 0) - collected(app);
  const paid = collected(app);

  return (
    <div className="min-h-screen bg-[#F8F5F2]">
      <Topbar user={user} active="students" />
      <main className="mx-auto max-w-5xl px-5 py-8">
        <Link to="/admin/students" data-testid="student-detail-back-link" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition-colors hover:text-[#BE185D]">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Students
        </Link>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[#6E0A28] p-7 text-white">
          <div className="flex items-center gap-4">
            {app.photo ? (
              <img src={app.photo} alt="student" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white/30" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 font-display text-2xl">
                {initials(app.full_name)}
              </span>
            )}
            <div>
              <h1 className="font-display text-3xl font-semibold">{app.full_name}</h1>
              <p className="mt-1 font-mono text-xs text-white/70">{app.application_number} · {fmtDate(app.created_at)}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLE[app.status]}`}>{STATUS_LABEL[app.status]}</span>
            <a data-testid="student-whatsapp-link" href={waLink(app.mobile)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold transition-colors hover:bg-white/20">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
            {app.guardian_mobile && (
              <a data-testid="student-whatsapp-guardian-link" href={waLink(app.guardian_mobile)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold transition-colors hover:bg-white/20">
                <MessageCircle className="h-3.5 w-3.5" /> Guardian
              </a>
            )}
            {app.email && (
              <a data-testid="student-email-link" href={`mailto:${app.email}`} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold transition-colors hover:bg-white/20">
                <Mail className="h-3.5 w-3.5" /> Email
              </a>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-rose-100 bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Planned Fees</p>
            <p className="mt-3 font-display text-4xl font-semibold text-[#22090F]">{inr(app.fee_total)}</p>
            <div className="mt-4 flex gap-2">
              <input data-testid="student-fee-plan-input" className="form-input" placeholder="Set plan ₹" value={plan} onChange={(e) => setPlan(e.target.value)} />
              <button data-testid="student-fee-plan-save-button" onClick={savePlan} disabled={busy} className="shrink-0 rounded-xl bg-[#22090F] px-4 text-xs font-bold text-white disabled:opacity-60">Save</button>
            </div>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Collected</p>
            <p className="mt-3 font-display text-4xl font-semibold text-emerald-700">{inr(paid)}</p>
            <p className="mt-4 text-xs text-slate-400">{(app.payments || []).length} receipt(s)</p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Outstanding</p>
            <p className={`mt-3 font-display text-4xl font-semibold ${balance > 0 ? "text-[#9F1239]" : "text-slate-400"}`}>{inr(balance)}</p>
            <p className="mt-4 text-xs text-slate-400">{balance > 0 ? "Yet to collect" : "Fully settled"}</p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-rose-100 bg-white p-6">
          <p className="text-sm font-bold text-[#22090F]">Fee Collection</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input data-testid="student-payment-amount-input" className="form-input" placeholder="Amount ₹" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            <input data-testid="student-payment-reference-input" className="form-input" placeholder="Reference (UPI / receipt no.)" value={payRef} onChange={(e) => setPayRef(e.target.value)} />
            <button data-testid="student-payment-add-button" onClick={addPayment} disabled={busy} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#BE185D] px-6 py-3 text-xs font-bold text-white transition-colors hover:bg-[#9F1239] disabled:opacity-60">
              <Plus className="h-4 w-4" /> Record Payment
            </button>
          </div>
          <div className="mt-5 space-y-2">
            {(app.payments || []).slice().reverse().map((p, i) => (
              <div key={i} data-testid={`student-payment-record-${i}`} className="flex items-center justify-between rounded-xl bg-emerald-50/60 px-4 py-3 text-sm">
                <span className="font-semibold text-emerald-800">{inr(p.amount)}</span>
                <span className="text-xs text-slate-500">{p.reference || "No reference"} · {fmtDate(p.created_at)}</span>
              </div>
            ))}
            {(app.payments || []).length === 0 && <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-400">No payments recorded yet.</p>}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {[
            { t: "Basic Info", rows: [["Mobile", app.mobile], ["Email", app.email], ["Date of Birth", app.dob], ["Gender", app.gender], ["Aadhaar", app.aadhaar], ["Nationality", app.nationality], ["Religion / Caste", [app.religion, app.caste].filter(Boolean).join(" · ")], ["Blood Group", app.blood_group]] },
            { t: "Programme", rows: [["Programme", app.programme], ["College", app.college], ["Hostel", app.hostel], ["Transport", app.transport]] },
            { t: "Communication & Guardian", rows: [["Address", [app.address_line1, app.address_line2].filter(Boolean).join(", ")], ["City", app.city], ["State", app.state], ["Pincode", app.pincode], ["Guardian", app.guardian_name], ["Guardian Mobile", app.guardian_mobile], ["Guardian Email", app.guardian_email], ["Guardian Occupation", app.guardian_occupation], ["Emergency", [app.emergency_name, app.emergency_mobile].filter(Boolean).join(" · ")]] },
            { t: "Academic Record", rows: [["10th — Board / Year", [app.b10_board, app.b10_year].filter(Boolean).join(" / ")], ["10th — % / School", [app.b10_pct, app.b10_school].filter(Boolean).join(" · ")], ["12th — Board / Year", [app.b12_board, app.b12_year].filter(Boolean).join(" / ")], ["12th — Stream / %", [app.b12_stream, app.b12_pct].filter(Boolean).join(" / ")], ["12th — School", app.b12_school], ["Other Qualifications", app.other_qualification]] },
            { t: "Payment & Reference (Application)", rows: [["Payment Mode", app.payment_mode], ["Reference", app.payment_reference], ["Paid To", app.payment_receiver], ["Referral Source", app.referral_source], ["Remarks", app.payment_remarks]] },
            { t: "Declaration", rows: [["Confirmed Accurate", app.agree_accurate ? "Yes" : "No"], ["Consent to Communication", app.agree_communication ? "Yes" : "No"], ["Signature", app.signature]] },
          ].map((sec) => (
            <div key={sec.t} className="rounded-3xl border border-rose-100 bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#BE185D]">{sec.t}</p>
              <div className="mt-2">
                {sec.rows.map(([label, value]) => (
                  <Row key={label} label={label} value={value} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-teal-100 bg-teal-50/40 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0F766E]">Admin Actions</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Status</label>
              <select data-testid="student-status-select" className="form-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                {["submitted", "shortlist", "approved", "rejected"].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Admin Notes</label>
              <textarea data-testid="student-notes-input" rows={2} className="form-input resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes..." />
            </div>
          </div>
          {error && <p data-testid="student-detail-error" className="mt-3 rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-[#9F1239]">{error}</p>}
          <div className="mt-4 flex items-center justify-between">
            <button data-testid="student-delete-button" onClick={del} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-5 py-2.5 text-xs font-bold text-[#9F1239] transition-colors hover:bg-rose-50 disabled:opacity-60">
              <Trash2 className="h-3.5 w-3.5" /> Delete Application
            </button>
            <button data-testid="student-save-status-button" onClick={saveStatus} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-6 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#9F1239] disabled:opacity-60">
              <Check className="h-3.5 w-3.5" /> Save Status &amp; Notes
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
