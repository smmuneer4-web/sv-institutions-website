import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, ArrowUpRight } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const COLLEGES = ["S V College of Nursing", "D R Vijayakumari School of Nursing"];
const PROGRAMS = ["B.Sc. Nursing", "M.Sc. Nursing", "GNM (DGNM)"];
const EMPTY = {
  name: "",
  phone: "",
  email: "",
  college: COLLEGES[0],
  program: PROGRAMS[0],
  city: "",
  message: "",
};

export default function EnquiryModal({ open, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const close = () => {
    onClose();
    setTimeout(() => {
      setForm(EMPTY);
      setStatus("idle");
      setError("");
    }, 300);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || form.phone.replace(/\D/g, "").length < 10 || !/^\S+@\S+\.\S+$/.test(form.email)) {
      setError("Please enter your full name, a valid phone number and a valid email address.");
      return;
    }
    setStatus("loading");
    try {
      await axios.post(`${API}/enquiries`, form);
      setStatus("success");
    } catch {
      setStatus("idle");
      setError("Something went wrong while submitting. Please call us at +91 90378 34632.");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-testid="enquiry-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#22090F]/75 p-4 backdrop-blur-md sm:p-8"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 26 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 26 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            data-testid="enquiry-modal-card"
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between bg-[#6E0A28] px-6 py-4 text-white">
              <div>
                <p className="font-display text-2xl font-semibold">Submit Enquiry</p>
                <p className="text-xs text-white/70">Admissions office · S V Group of Institutions</p>
              </div>
              <button
                data-testid="enquiry-modal-close-button"
                onClick={close}
                aria-label="Close enquiry form"
                className="rounded-full border border-white/25 p-2 transition-colors hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {status === "success" ? (
              <div data-testid="enquiry-modal-success" className="flex flex-col items-center px-8 py-12 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
                  <CheckCircle2 className="h-8 w-8 text-[#0D9488]" />
                </span>
                <h3 className="mt-6 font-display text-3xl font-semibold text-[#22090F]">Enquiry received!</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Thank you, {form.name.split(" ")[0]}. Our admissions team will reach out to you shortly on
                  your phone and email.
                </p>
                <button
                  data-testid="enquiry-modal-done-button"
                  onClick={close}
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-7 py-3 text-sm font-bold text-white transition-colors hover:bg-[#9F1239]"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="overflow-y-auto px-6 py-6">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Full Name *</label>
                    <input data-testid="enquiry-name-input" className="form-input" placeholder="Your full name" value={form.name} onChange={set("name")} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Phone Number *</label>
                      <input data-testid="enquiry-phone-input" className="form-input" placeholder="+91 98765 43210" value={form.phone} onChange={set("phone")} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Email *</label>
                      <input data-testid="enquiry-email-input" type="email" className="form-input" placeholder="you@example.com" value={form.email} onChange={set("email")} />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Select College *</label>
                      <select data-testid="enquiry-college-select" className="form-input" value={form.college} onChange={set("college")}>
                        {COLLEGES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Select Program *</label>
                      <select data-testid="enquiry-program-select" className="form-input" value={form.program} onChange={set("program")}>
                        {PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">State / City</label>
                    <input data-testid="enquiry-city-input" className="form-input" placeholder="e.g. Bangalore" value={form.city} onChange={set("city")} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Message</label>
                    <textarea data-testid="enquiry-message-input" rows={2} className="form-input resize-none" placeholder="Any specific enquiry about admissions, seats or eligibility..." value={form.message} onChange={set("message")} />
                  </div>
                </div>

                {error && (
                  <p data-testid="enquiry-modal-error" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-[#9F1239]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  data-testid="enquiry-modal-submit-button"
                  disabled={status === "loading"}
                  className="group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#BE185D] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-900/20 transition-all duration-300 hover:bg-[#9F1239] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === "loading" ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Submitting...
                    </span>
                  ) : (
                    <>
                      Submit Enquiry
                      <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
