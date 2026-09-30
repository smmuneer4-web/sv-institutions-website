import { useState } from "react";
import { X, Save } from "lucide-react";
import { api, formatApiError } from "../lib/api";

const GROUPS = [
  {
    title: "Basic Information",
    fields: [
      ["full_name", "Full Name"], ["mobile", "Mobile"], ["email", "Email"], ["dob", "Date of Birth", "date"],
      ["gender", "Gender"], ["aadhaar", "Aadhaar"], ["nationality", "Nationality"], ["religion", "Religion"],
      ["caste", "Caste"], ["blood_group", "Blood Group"],
    ],
  },
  {
    title: "Course",
    fields: [["programme", "Programme"], ["college", "College"], ["hostel", "Hostel (Yes/No)"], ["transport", "Transport (Yes/No)"]],
  },
  {
    title: "Communication & Guardian",
    fields: [
      ["address_line1", "Address Line 1"], ["address_line2", "Address Line 2"], ["city", "City"], ["state", "State"],
      ["pincode", "Pincode"], ["guardian_name", "Guardian Name"], ["guardian_mobile", "Guardian Mobile"],
      ["guardian_email", "Guardian Email"], ["guardian_occupation", "Guardian Occupation"],
      ["emergency_name", "Emergency Name"], ["emergency_mobile", "Emergency Mobile"],
    ],
  },
  {
    title: "Academic Record",
    fields: [
      ["b10_board", "10th Board"], ["b10_year", "10th Year"], ["b10_pct", "10th %"], ["b10_school", "10th School"],
      ["b12_board", "12th Board"], ["b12_year", "12th Year"], ["b12_stream", "12th Stream"], ["b12_pct", "12th %"],
      ["b12_school", "12th School"], ["other_qualification", "Other Qualifications"],
    ],
  },
  {
    title: "Payment & Reference",
    fields: [
      ["payment_mode", "Payment Mode"], ["payment_reference", "Reference"], ["payment_receiver", "Paid To"],
      ["referral_source", "Referral Source"], ["payment_remarks", "Remarks"],
    ],
  },
];

export default function ApplicationEditorModal({ app, onClose, onSaved }) {
  const [draft, setDraft] = useState(() => {
    const d = {};
    GROUPS.forEach((g) => g.fields.forEach(([k]) => (d[k] = app[k] ?? "")));
    return d;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setField = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setError("");
    const payload = {};
    GROUPS.forEach((g) => g.fields.forEach(([k]) => {
      if (String(draft[k] ?? "") !== String(app[k] ?? "")) payload[k] = draft[k];
    }));
    try {
      const { data } = Object.keys(payload).length
        ? await api.patch(`/applications/${app.id}`, payload)
        : { data: app };
      onSaved(data);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#22090F]/70 p-4 backdrop-blur-sm sm:p-8" onClick={onClose}>
      <div
        data-testid="application-editor-modal"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4 bg-[#6E0A28] px-6 py-4 text-white">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/70">Edit application</p>
            <p className="font-display text-xl font-semibold">{app.full_name}</p>
          </div>
          <button onClick={onClose} aria-label="Close" data-testid="editor-close-button" className="rounded-full border border-white/25 p-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5" data-lenis-prevent>
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#BE185D]">{g.title}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {g.fields.map(([k, label, type]) => (
                  <div key={k}>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</label>
                    <input
                      data-testid={`editor-field-${k}`}
                      type={type || "text"}
                      className="form-input text-sm"
                      value={draft[k] ?? ""}
                      onChange={setField(k)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {error && <p data-testid="editor-error" className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-[#9F1239]">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-rose-100 bg-[#F8F5F2] px-6 py-4">
          <button onClick={onClose} className="rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600">Cancel</button>
          <button data-testid="editor-save-button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-200 transition-colors hover:bg-[#9F1239] disabled:opacity-60">
            <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
