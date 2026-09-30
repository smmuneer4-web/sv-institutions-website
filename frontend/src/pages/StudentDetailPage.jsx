import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, BellRing, FileDown, Pencil, Trash2, Plus, X, Check,
  Building2, GraduationCap, Phone, Mail, AlertTriangle, IndianRupee, CalendarDays, Wallet,
} from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { useAdminAuth, Topbar, STATUS_STYLE, STATUS_LABEL, initials, fmtDate, inr, collected, waLink } from "../lib/admin";

const METHODS = ["UPI", "Bank Transfer", "Cash", "Cheque", "Card", "Other"];
const YEARS = ["year1", "year2", "year3", "year4"];

const Row = ({ label, value }) => (
  <div className="flex justify-between gap-4 border-b border-rose-50 py-2 text-sm last:border-0">
    <span className="shrink-0 font-semibold text-slate-400">{label}</span>
    <span className="text-right font-medium text-[#22090F]">{value === "" || value == null ? "—" : String(value)}</span>
  </div>
);

const CardHead = ({ icon: Icon, title, children }) => (
  <div className="flex items-center justify-between gap-3">
    <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-[#22090F]">
      <Icon className="h-4 w-4 text-[#BE185D]" /> {title}
    </p>
    {children}
  </div>
);

export default function StudentDetailPage() {
  const { ref } = useParams();
  const navigate = useNavigate();
  const [user] = useAdminAuth();
  const [app, setApp] = useState(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [planEdit, setPlanEdit] = useState(false);
  const [planYears, setPlanYears] = useState({ year1: "", year2: "", year3: "", year4: "" });
  const [profileEdit, setProfileEdit] = useState(false);
  const [profile, setProfile] = useState({ full_name: "", mobile: "", email: "" });
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");

  const emptySchedule = { label: "", amount: "", due_date: "", remarks: "" };
  const [scheduleForm, setScheduleForm] = useState(null);
  const emptyPayment = { amount: "", schedule_id: "", method: "UPI", remarks: "" };
  const [paymentForm, setPaymentForm] = useState(null);

  useEffect(() => {
    if (!user) return;
    api.get(`/applications/by-number/${ref}`)
      .then(({ data }) => {
        setApp(data);
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

  const schedules = app.schedules || [];
  const payments = (app.payments || []).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const paid = collected(app);
  const planned = Number(app.fee_total || 0);
  const scheduledTotal = schedules.reduce((s, x) => s + Number(x.amount || 0), 0);
  const balance = planned - paid;

  const paidBySchedule = (sid) => payments.filter((p) => p.schedule_id === sid).reduce((s, p) => s + Number(p.amount || 0), 0);
  const today = new Date().setHours(0, 0, 0, 0);
  const scheduleState = (sc) => {
    const outstanding = Number(sc.amount || 0) - paidBySchedule(sc.id);
    const overdueDays = sc.due_date ? Math.floor((today - new Date(sc.due_date).setHours(0, 0, 0, 0)) / 86400000) : -1;
    const isOverdue = outstanding > 0 && overdueDays >= 0;
    return { outstanding, overdueDays, isOverdue };
  };
  const overdueRows = schedules.map((sc) => ({ ...sc, ...scheduleState(sc) })).filter((s) => s.isOverdue);

  const reminderText = encodeURIComponent(
    `Dear Parent, this is a fee reminder from S V Group of Institutions for ${app.full_name} (${app.application_number}). ` +
    (overdueRows.length
      ? `${overdueRows.length} installment(s) are overdue — outstanding on overdue schedules: ${inr(overdueRows.reduce((s, r) => s + r.outstanding, 0))}. `
      : `Outstanding balance: ${inr(balance)}. `) +
    "Kindly clear the dues at the earliest. - Admissions Office"
  );
  const reminderTarget = app.guardian_mobile || app.mobile;
  const reminderHref = reminderTarget ? `${waLink(reminderTarget)}?text=${reminderText}` : null;

  const run = (fn) => {
    setBusy(true);
    setError("");
    fn()
      .then(({ data }) => {
        setApp(data);
        setStatus(data.status);
        setNotes(data.admin_notes || "");
      })
      .catch((e) => setError(formatApiError(e)))
      .finally(() => setBusy(false));
  };

  const savePlan = () =>
    run(async () => {
      const fee_years = {
        year1: Number(planYears.year1 || 0),
        year2: Number(planYears.year2 || 0),
        year3: Number(planYears.year3 || 0),
        year4: Number(planYears.year4 || 0),
      };
      const { data } = await api.patch(`/applications/${app.id}/fee-years`, { fee_years });
      setApp(data);
      setPlanEdit(false);
    });

  const saveProfile = () =>
    run(async () => {
      const { data } = await api.patch(`/applications/${app.id}`, { full_name: profile.full_name, mobile: profile.mobile, email: profile.email });
      setApp(data);
      setProfileEdit(false);
    });

  const saveStatus = () => run(async () => {
    const { data } = await api.patch(`/applications/${app.id}`, { status, admin_notes: notes });
    setApp(data);
  });

  const submitSchedule = () =>
    run(async () => {
      const payload = { label: scheduleForm.label, amount: Number(scheduleForm.amount), due_date: scheduleForm.due_date, remarks: scheduleForm.remarks };
      const { data } = scheduleForm.mode === "add"
        ? await api.post(`/applications/${app.id}/schedules`, payload)
        : await api.patch(`/applications/${app.id}/schedules/${scheduleForm.id}`, payload);
      setApp(data);
      setScheduleForm(null);
    });

  const removeSchedule = (id) =>
    run(async () => {
      const { data } = await api.delete(`/applications/${app.id}/schedules/${id}`);
      setApp(data);
    });

  const submitPayment = () =>
    run(async () => {
      const payload = { amount: Number(paymentForm.amount), schedule_id: paymentForm.schedule_id, method: paymentForm.method, remarks: paymentForm.remarks };
      const { data } = paymentForm.mode === "add"
        ? await api.post(`/applications/${app.id}/payments`, payload)
        : await api.patch(`/applications/${app.id}/payments/${paymentForm.id}`, payload);
      setApp(data);
      setPaymentForm(null);
    });

  const removePayment = (id) =>
    run(async () => {
      const { data } = await api.delete(`/applications/${app.id}/payments/${id}`);
      setApp(data);
    });

  const del = () =>
    run(async () => {
      if (!window.confirm(`Delete application ${app.application_number}? This cannot be undone.`)) return;
      await api.delete(`/applications/${app.id}`);
      navigate("/admin/students");
    });

  const studentStatus = app.status === "approved" ? "Enrolled" : app.status === "shortlist" ? "Shortlisted" : "Applied";
  const yearLabel = { year1: "Year 1", year2: "Year 2", year3: "Year 3", year4: "Year 4" };
  const btn = "inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-all hover:border-[#BE185D] hover:text-[#BE185D]";

  return (
    <div className="min-h-screen bg-[#F8F5F2]">
      <Topbar user={user} active="students" />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-semibold text-slate-400">{app.application_number}</p>
            <h1 className="mt-1 font-display text-4xl font-semibold text-[#22090F]">{app.full_name}</h1>
            <p className="mt-1 text-sm text-slate-500">{app.college} · {app.programme}</p>
          </div>
          <div className="no-print flex flex-wrap items-center gap-2">
            <Link to="/admin/students" data-testid="student-detail-back-link" className={btn}>
              <ArrowLeft className="h-3.5 w-3.5" /> All students
            </Link>
            {reminderHref && (
              <a data-testid="student-send-reminder-link" href={reminderHref} target="_blank" rel="noreferrer"
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${overdueRows.length ? "bg-[#BE185D] text-white shadow-md shadow-rose-200 hover:bg-[#9F1239]" : "border border-rose-200 bg-white text-slate-600 hover:border-[#BE185D] hover:text-[#BE185D]"}`}>
                <BellRing className="h-3.5 w-3.5" /> Send Reminder{overdueRows.length ? ` (${overdueRows.length})` : ""}
              </a>
            )}
            <button data-testid="student-download-pdf-button" onClick={() => window.print()} className={btn}>
              <FileDown className="h-3.5 w-3.5" /> Download PDF
            </button>
          </div>
        </div>

        {overdueRows.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} data-testid="overdue-banner"
            className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#BE185D]" />
              <div>
                <p className="text-sm font-bold text-[#9F1239]">{overdueRows.length} installment{overdueRows.length > 1 ? "s are" : " is"} overdue</p>
                <p className="text-xs text-slate-500">Outstanding on overdue schedules: {inr(overdueRows.reduce((s, r) => s + r.outstanding, 0))}</p>
              </div>
            </div>
            {reminderHref && (
              <a data-testid="overdue-send-reminder-button" href={reminderHref} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-200 transition-all hover:bg-[#9F1239]">
                <BellRing className="h-3.5 w-3.5" /> Send Reminder
              </a>
            )}
          </motion.div>
        )}

        <div className="mt-6 rounded-3xl border border-rose-100 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {app.photo ? (
                <img src={app.photo} alt="student" className="h-14 w-14 rounded-2xl object-cover" />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 font-display text-xl text-[#BE185D]">
                  {initials(app.full_name)}
                </span>
              )}
              <div className="text-sm text-slate-600">
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4 text-[#0D9488]" /> {app.college}</span>
                  <span className="inline-flex items-center gap-1.5"><GraduationCap className="h-4 w-4 text-[#0D9488]" /> {app.programme}</span>
                </p>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                  {app.mobile && <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {app.mobile}</span>}
                  {app.email && <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {app.email}</span>}
                </p>
              </div>
            </div>
            <button data-testid="student-profile-edit-button" onClick={() => { setProfileEdit(true); setProfile({ full_name: app.full_name, mobile: app.mobile, email: app.email }); }}
              className="no-print inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-xs font-bold text-slate-600 transition-all hover:border-[#BE185D] hover:text-[#BE185D]">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          </div>

          <AnimatePresence>
            {profileEdit && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-5 grid gap-3 rounded-2xl bg-rose-50/50 p-4 sm:grid-cols-3">
                  <input data-testid="student-profile-name-input" className="form-input" value={profile.full_name} onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))} placeholder="Full name" />
                  <input data-testid="student-profile-mobile-input" className="form-input" value={profile.mobile} onChange={(e) => setProfile((p) => ({ ...p, mobile: e.target.value }))} placeholder="Mobile" />
                  <input data-testid="student-profile-email-input" className="form-input" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} placeholder="Email" />
                  <div className="flex gap-2 sm:col-span-3">
                    <button data-testid="student-profile-save-button" onClick={saveProfile} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-5 py-2 text-xs font-bold text-white disabled:opacity-60"><Check className="h-3.5 w-3.5" /> Save</button>
                    <button data-testid="student-profile-cancel-button" onClick={() => setProfileEdit(false)} className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-5 py-2 text-xs font-bold text-slate-500"><X className="h-3.5 w-3.5" /> Cancel</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-rose-50 pt-5 lg:grid-cols-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Student Status</p>
              <p className="mt-1.5 text-sm font-bold text-[#22090F]">{studentStatus}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Enrolled On</p>
              <p className="mt-1.5 text-sm font-bold text-[#22090F]">{app.status === "approved" ? fmtDate(app.created_at) : "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Application Status</p>
              <p className="mt-1.5"><span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLE[app.status]}`}>{STATUS_LABEL[app.status]}</span></p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Submitted</p>
              <p className="mt-1.5 text-sm font-bold text-[#22090F]">{fmtDate(app.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { icon: IndianRupee, label: "Planned Fees", value: inr(planned), color: "text-[#22090F]", testid: "student-stat-planned" },
            { icon: CalendarDays, label: "Scheduled", value: inr(scheduledTotal), color: "text-[#22090F]", testid: "student-stat-scheduled" },
            { icon: Wallet, label: "Collected", value: inr(paid), color: "text-emerald-700", testid: "student-stat-collected" },
            { icon: IndianRupee, label: "Balance", value: inr(balance), color: balance > 0 ? "text-[#9F1239]" : "text-slate-400", testid: "student-stat-balance" },
          ].map((s) => (
            <div key={s.label} data-testid={s.testid} className="rounded-2xl border border-rose-100 bg-white p-5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                <s.icon className="h-3.5 w-3.5" /> {s.label}
              </p>
              <p className={`mt-2.5 font-display text-3xl font-semibold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-3xl border border-rose-100 bg-white p-6">
          <CardHead icon={IndianRupee} title="Fee Plan">
            <button data-testid="student-plan-edit-button" onClick={() => { setPlanEdit(!planEdit); setPlanYears({ year1: app.fee_years?.year1 ?? "", year2: app.fee_years?.year2 ?? "", year3: app.fee_years?.year3 ?? "", year4: app.fee_years?.year4 ?? "" }); }}
              className="no-print inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-xs font-bold text-slate-600 transition-all hover:border-[#BE185D] hover:text-[#BE185D]">
              <Pencil className="h-3.5 w-3.5" /> {planEdit ? "Close" : "Edit"}
            </button>
          </CardHead>
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {YEARS.map((y) => (
              <div key={y} className="rounded-2xl border border-rose-50 bg-[#F8F5F2] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{yearLabel[y]}</p>
                {planEdit ? (
                  <input data-testid={`student-plan-${y}-input`} inputMode="numeric" className="form-input mt-2 py-2 text-right text-sm font-bold" placeholder="0"
                    value={planYears[y]} onChange={(e) => setPlanYears((p) => ({ ...p, [y]: e.target.value.replace(/[^0-9]/g, "") }))} />
                ) : (
                  <p className="mt-1.5 font-display text-2xl font-semibold text-[#22090F]">{inr(app.fee_years?.[y] || 0)}</p>
                )}
              </div>
            ))}
          </div>
          {planEdit && (
            <div className="mt-4 flex gap-2">
              <button data-testid="student-plan-save-button" onClick={savePlan} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60"><Check className="h-3.5 w-3.5" /> Save Fee Plan</button>
              <button data-testid="student-plan-cancel-button" onClick={() => setPlanEdit(false)} className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-500"><X className="h-3.5 w-3.5" /> Cancel</button>
            </div>
          )}
        </div>

        <div className="mt-5 rounded-3xl border border-rose-100 bg-white p-6">
          <CardHead icon={CalendarDays} title="Payment Schedule">
            <button data-testid="student-add-schedule-button" onClick={() => setScheduleForm(scheduleForm ? null : { mode: "add", id: null, ...emptySchedule })}
              className="no-print inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-4 py-2 text-xs font-bold text-white transition-all hover:bg-[#9F1239]">
              <Plus className="h-3.5 w-3.5" /> Add Schedule
            </button>
          </CardHead>

          <AnimatePresence>
            {scheduleForm && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-4 grid gap-3 rounded-2xl bg-rose-50/50 p-4 sm:grid-cols-4">
                  <input data-testid="student-schedule-label-input" className="form-input" placeholder="Label (e.g. Tuition Year 1)" value={scheduleForm.label} onChange={(e) => setScheduleForm((f) => ({ ...f, label: e.target.value }))} />
                  <input data-testid="student-schedule-amount-input" className="form-input" inputMode="numeric" placeholder="Amount ₹" value={scheduleForm.amount} onChange={(e) => setScheduleForm((f) => ({ ...f, amount: e.target.value.replace(/[^0-9]/g, "") }))} />
                  <input data-testid="student-schedule-date-input" className="form-input" type="date" value={scheduleForm.due_date} onChange={(e) => setScheduleForm((f) => ({ ...f, due_date: e.target.value }))} />
                  <input data-testid="student-schedule-remarks-input" className="form-input" placeholder="Remarks" value={scheduleForm.remarks} onChange={(e) => setScheduleForm((f) => ({ ...f, remarks: e.target.value }))} />
                  <div className="flex gap-2 sm:col-span-4">
                    <button data-testid="student-schedule-save-button" onClick={submitSchedule} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-5 py-2 text-xs font-bold text-white disabled:opacity-60"><Check className="h-3.5 w-3.5" /> {scheduleForm.mode === "add" ? "Add Schedule" : "Save Changes"}</button>
                    <button data-testid="student-schedule-cancel-button" onClick={() => setScheduleForm(null)} className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-5 py-2 text-xs font-bold text-slate-500"><X className="h-3.5 w-3.5" /> Cancel</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-rose-100 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  <th className="py-3 pr-4">Label</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Remarks</th>
                  <th className="px-4 py-3 text-right no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((sc) => {
                  const st = scheduleState(sc);
                  return (
                    <tr key={sc.id} data-testid={`student-schedule-row-${sc.id}`} className="border-b border-rose-50 align-top last:border-0">
                      <td className="py-3.5 pr-4 font-semibold text-[#22090F]">{sc.label}</td>
                      <td className="px-4 py-3.5 font-semibold text-[#22090F]">{inr(sc.amount)}</td>
                      <td className="px-4 py-3.5 text-slate-600">{sc.due_date ? fmtDate(sc.due_date) : "—"}</td>
                      <td className="px-4 py-3.5 text-slate-500">{sc.remarks || "—"}</td>
                      <td className="px-4 py-3.5 text-right no-print">
                        <button data-testid={`student-schedule-edit-${sc.id}`} aria-label="Edit schedule" onClick={() => setScheduleForm({ mode: "edit", id: sc.id, label: sc.label, amount: String(sc.amount), due_date: sc.due_date || "", remarks: sc.remarks || "" })} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-[#BE185D]"><Pencil className="h-4 w-4" /></button>
                        <button data-testid={`student-schedule-delete-${sc.id}`} aria-label="Delete schedule" onClick={() => window.confirm(`Remove schedule "${sc.label}"?`) && removeSchedule(sc.id)} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-[#9F1239]"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  );
                })}
                {schedules.length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-center text-xs text-slate-400">No schedules yet. Click "Add Schedule" to plan installments.</td></tr>
                )}
              </tbody>
              {schedules.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-rose-100">
                    <td className="py-3.5 pr-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Total Scheduled</td>
                    <td className="px-4 py-3.5 font-display text-xl font-semibold text-[#BE185D]">{inr(scheduledTotal)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-rose-100 bg-white p-6">
          <CardHead icon={Wallet} title="Payments Collected">
            <button data-testid="student-log-payment-button" onClick={() => setPaymentForm(paymentForm ? null : { mode: "add", id: null, ...emptyPayment, schedule_id: schedules[0]?.id || "" })}
              className="no-print inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-4 py-2 text-xs font-bold text-white transition-all hover:bg-[#9F1239]">
              <Plus className="h-3.5 w-3.5" /> Log Payment
            </button>
          </CardHead>

          <AnimatePresence>
            {paymentForm && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-4 grid gap-3 rounded-2xl bg-rose-50/50 p-4 sm:grid-cols-4">
                  <input data-testid="student-payment-form-amount-input" className="form-input" inputMode="numeric" placeholder="Amount ₹" value={paymentForm.amount} onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value.replace(/[^0-9]/g, "") }))} />
                  <select data-testid="student-payment-form-schedule-select" className="form-input" value={paymentForm.schedule_id} onChange={(e) => setPaymentForm((f) => ({ ...f, schedule_id: e.target.value }))}>
                    <option value="">No schedule (general)</option>
                    {schedules.map((sc) => <option key={sc.id} value={sc.id}>{sc.label} — {inr(sc.amount)}</option>)}
                  </select>
                  <select data-testid="student-payment-form-method-select" className="form-input" value={paymentForm.method} onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))}>
                    {METHODS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                  <input data-testid="student-payment-form-remarks-input" className="form-input" placeholder="Remarks / receipt no." value={paymentForm.remarks} onChange={(e) => setPaymentForm((f) => ({ ...f, remarks: e.target.value }))} />
                  <div className="flex gap-2 sm:col-span-4">
                    <button data-testid="student-payment-form-save-button" onClick={submitPayment} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-5 py-2 text-xs font-bold text-white disabled:opacity-60"><Check className="h-3.5 w-3.5" /> {paymentForm.mode === "add" ? "Log Payment" : "Save Changes"}</button>
                    <button data-testid="student-payment-form-cancel-button" onClick={() => setPaymentForm(null)} className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-5 py-2 text-xs font-bold text-slate-500"><X className="h-3.5 w-3.5" /> Cancel</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-rose-100 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  <th className="py-3 pr-4">Date</th>
                  <th className="px-4 py-3">Schedule / Fee</th>
                  <th className="px-4 py-3">Received In</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Remarks</th>
                  <th className="px-4 py-3 text-right no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const sc = schedules.find((x) => x.id === p.schedule_id);
                  return (
                    <tr key={p.id || p.created_at} data-testid={`student-payment-row-${p.id || p.created_at}`} className="border-b border-rose-50 align-top last:border-0">
                      <td className="py-3.5 pr-4 text-slate-600">{fmtDate(p.created_at)}</td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-[#22090F]">{sc ? sc.label : "General"}</p>
                        {p.remarks && <p className="text-xs text-slate-400">{p.remarks}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{p.method || "—"}</td>
                      <td className="px-4 py-3.5 font-semibold text-emerald-700">{inr(p.amount)}</td>
                      <td className="px-4 py-3.5 text-slate-500">{p.reference || "—"}</td>
                      <td className="px-4 py-3.5 text-right no-print">
                        <button data-testid={`student-payment-edit-${p.id || p.created_at}`} aria-label="Edit payment" onClick={() => setPaymentForm({ mode: "edit", id: p.id, amount: String(p.amount), schedule_id: p.schedule_id || "", method: p.method || "UPI", remarks: p.remarks || "" })} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-[#BE185D]"><Pencil className="h-4 w-4" /></button>
                        <button data-testid={`student-payment-delete-${p.id || p.created_at}`} aria-label="Delete payment" onClick={() => window.confirm("Remove this payment record?") && removePayment(p.id || p.created_at)} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-[#9F1239]"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  );
                })}
                {payments.length === 0 && (
                  <tr><td colSpan={6} className="py-10 text-center text-xs text-slate-400">No payments collected yet.</td></tr>
                )}
              </tbody>
              {payments.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-rose-100">
                    <td className="py-3.5 pr-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Total Collected</td>
                    <td colSpan={2} />
                    <td className="px-4 py-3.5 font-display text-xl font-semibold text-emerald-700">{inr(paid)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <div className="no-print mt-5 rounded-3xl border border-teal-100 bg-teal-50/40 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0F766E]">Admin Actions</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Application Status</label>
              <select data-testid="student-status-select" className="form-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                {["submitted", "shortlist", "approved", "rejected"].map((st) => <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Admin Notes</label>
              <textarea data-testid="student-notes-input" rows={2} className="form-input resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes..." />
            </div>
          </div>
          {error && <p data-testid="student-detail-error" className="mt-3 rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-[#9F1239]">{error}</p>}
          <div className="mt-4 flex items-center justify-between">
            <button data-testid="student-delete-button" onClick={del} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-bold text-[#9F1239] transition-colors hover:bg-rose-50 disabled:opacity-60">
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
