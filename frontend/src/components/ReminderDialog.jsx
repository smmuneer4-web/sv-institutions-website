import { useEffect, useMemo, useState } from "react";
import { X, MessageCircle, Mail, Copy, Phone, BellRing } from "lucide-react";

const rupee = (n) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "");

const normalisePhone = (raw) => {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
};

export const buildReminderMessage = (student, overdueItems = []) => {
  const guardian = student.guardian_name || "Guardian";
  const lines = [
    `Dear ${guardian},`,
    "",
    `This is a friendly reminder from S V Group of Institutions regarding the fee payment for ${student.full_name || "the student"} (${student.application_number || ""}).`,
    "",
  ];
  if (overdueItems && overdueItems.length) {
    lines.push("The following installment(s) are overdue:");
    overdueItems.forEach((s) => lines.push(`  • ${s.label} — ${rupee(s.amount)}${s.due_date ? ` (due ${fmtDate(s.due_date)})` : ""}`));
    lines.push("");
  }
  const balance = Math.max(0, Number(student.balance ?? 0));
  if (balance > 0) lines.push(`Outstanding balance: ${rupee(balance)}.`);
  lines.push(
    "Please arrange the payment at your earliest convenience or contact the office if you need any assistance.",
    "",
    "Warm regards,",
    "Admissions Office",
    "S V Group of Institutions, Bengaluru",
    "+91 90378 34632 · admissions@svinstitutions.co.in",
  );
  return lines.join("\n");
};

export default function ReminderDialog({ open, onClose, student, overdueItems = [] }) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open && student) setMessage(buildReminderMessage(student, overdueItems));
  }, [open, student, overdueItems]);

  if (!open || !student) return null;

  const guardianPhone = normalisePhone(student.guardian_mobile || student.mobile);
  const studentPhone = normalisePhone(student.mobile);
  const email = student.guardian_email || student.email || "";

  const openWhatsApp = (phone, who) => {
    if (!phone) return;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  };

  const openEmail = () => {
    if (!email) return;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(`Fee reminder for ${student.full_name || "your ward"} — ${student.application_number || ""}`)}&body=${encodeURIComponent(message)}`;
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#22090F]/70 p-4 backdrop-blur-sm sm:p-8" onClick={onClose}>
      <div
        data-testid="reminder-dialog"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4 bg-[#6E0A28] px-6 py-4 text-white">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/70">Send fee reminder</p>
            <p className="font-display text-xl font-semibold">{student.full_name || "—"}</p>
          </div>
          <button onClick={onClose} aria-label="Close" data-testid="reminder-close-button" className="rounded-full border border-white/25 p-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5" data-lenis-prevent>
          {overdueItems.length ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] font-semibold text-[#9F1239]">
              {overdueItems.length} installment{overdueItems.length > 1 ? "s" : ""} overdue — pre-filled in the message below.
            </div>
          ) : (
            <div className="rounded-xl border border-teal-100 bg-teal-50/50 px-4 py-3 text-[12.5px] text-[#0F766E]">
              No overdue installments — you can still send a general balance reminder.
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Message</label>
            <textarea
              data-testid="reminder-message-input"
              rows={12}
              className="form-input resize-none font-mono text-[12.5px] leading-relaxed"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-slate-400">Edit freely before sending — opens in your WhatsApp / email app.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-rose-100 p-3">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">Guardian</p>
              <p className="mt-1 text-sm font-semibold text-[#22090F]">{student.guardian_name || "—"}</p>
              <p className="text-xs text-slate-500">{student.guardian_mobile || student.mobile || "—"}</p>
            </div>
            <div className="rounded-xl border border-rose-100 p-3">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">Email</p>
              <p className="mt-1 break-all text-sm font-semibold text-[#22090F]">{email || "—"}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-rose-100 bg-[#F8F5F2] px-6 py-4">
          <button data-testid="reminder-copy-button" onClick={copy} className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:border-[#BE185D] hover:text-[#BE185D]">
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
          {studentPhone && studentPhone !== guardianPhone && (
            <button data-testid="reminder-whatsapp-student-button" onClick={() => openWhatsApp(studentPhone)} className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-5 py-2.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-50">
              <Phone className="h-3.5 w-3.5" /> WhatsApp Student
            </button>
          )}
          <button data-testid="reminder-email-button" onClick={openEmail} disabled={!email} className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:border-[#BE185D] hover:text-[#BE185D] disabled:opacity-50">
            <Mail className="h-3.5 w-3.5" /> Email
          </button>
          <button data-testid="reminder-whatsapp-guardian-button" onClick={() => openWhatsApp(guardianPhone)} disabled={!guardianPhone} className="inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-200 transition-colors hover:bg-[#9F1239] disabled:opacity-50">
            <MessageCircle className="h-3.5 w-3.5" /> <BellRing className="hidden" /> WhatsApp Guardian
          </button>
        </div>
      </div>
    </div>
  );
}
