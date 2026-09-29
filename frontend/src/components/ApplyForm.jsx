import { useEffect, useState } from "react";
import axios from "axios";
import { MapPin, Phone, Mail, CheckCircle2, ArrowUpRight } from "lucide-react";
import { scrollToId } from "../lib/scroll";

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

const field = (id, label, props) => (
  <div>
    <label htmlFor={id} className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
      {label}
    </label>
    {props.children}
  </div>
);

export default function ApplyForm() {
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = (e) => {
      setForm((f) => ({ ...f, college: e.detail.college || f.college, program: e.detail.program || f.program }));
      setError("");
    };
    window.addEventListener("prefill-enquiry", handler);
    return () => window.removeEventListener("prefill-enquiry", handler);
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

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
      setError("Something went wrong while submitting. Please call us at +91 90370 41972.");
    }
  };

  const reset = () => {
    setForm(EMPTY);
    setStatus("idle");
  };

  return (
    <section id="apply" className="bg-gradient-to-b from-rose-50/70 to-transparent py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <div className="grid overflow-hidden rounded-[2rem] border border-rose-100 shadow-2xl shadow-rose-100/60 lg:grid-cols-2">
          <div className="relative flex flex-col justify-between overflow-hidden bg-[#6E0A28] p-9 text-white lg:p-12">
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-rose-500/15 blur-3xl" />
            <div className="relative">
              <p className="eyebrow text-teal-300">Admissions 2025</p>
              <h2 className="mt-5 font-display text-4xl font-semibold leading-tight sm:text-5xl">
                Begin your journey <span className="italic text-rose-300">in nursing.</span>
              </h2>
              <p className="mt-5 max-w-sm text-base leading-relaxed text-white/70">
                Share your details and our admissions team will guide you through eligibility, seats and the
                application process.
              </p>
            </div>
            <div className="relative mt-12 space-y-5">
              {[
                { icon: MapPin, text: "80 Feet Ring Road, Near Bangalore University, Mallathahalli Bus Stop, Bangalore - 560056" },
                { icon: Phone, text: "+91 90378 34632" },
                { icon: Mail, text: "admissions@svinstitutions.co.in" },
              ].map((c) => (
                <div key={c.text} className="flex items-start gap-4">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <c.icon className="h-4 w-4 text-teal-300" strokeWidth={2} />
                  </span>
                  <p className="text-sm leading-relaxed text-white/85">{c.text}</p>
                </div>
              ))}
              <p className="border-t border-white/15 pt-5 font-display text-lg italic text-rose-200">
                A Culture of Excellence in Learning
              </p>
            </div>
          </div>

          <div className="bg-white p-9 lg:p-12" data-testid="apply-form-container">
            {status === "success" ? (
              <div data-testid="apply-success-panel" className="flex h-full flex-col items-center justify-center py-16 text-center">
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-50">
                  <CheckCircle2 className="h-10 w-10 text-[#0D9488]" />
                </span>
                <h3 className="mt-7 font-display text-4xl font-semibold text-[#22090F]">Enquiry received!</h3>
                <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-600">
                  Thank you, {form.name.split(" ")[0]}. Our admissions team will reach out to you shortly on
                  your phone and email.
                </p>
                <button
                  data-testid="apply-submit-another-button"
                  onClick={reset}
                  className="mt-9 inline-flex items-center gap-2 rounded-full border-2 border-[#BE185D] px-7 py-3 text-sm font-bold text-[#BE185D] transition-all duration-300 hover:bg-[#BE185D] hover:text-white"
                >
                  Submit Another Enquiry
                </button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <div className="grid gap-5 sm:grid-cols-2">
                  {field("apply-name", "Full Name *", {
                    children: (
                      <input
                        id="apply-name"
                        data-testid="apply-name-input"
                        className="form-input"
                        placeholder="Your full name"
                        value={form.name}
                        onChange={set("name")}
                      />
                    ),
                  })}
                  {field("apply-phone", "Phone Number *", {
                    children: (
                      <input
                        id="apply-phone"
                        data-testid="apply-phone-input"
                        className="form-input"
                        placeholder="+91 98765 43210"
                        value={form.phone}
                        onChange={set("phone")}
                      />
                    ),
                  })}
                  {field("apply-email", "Email Address *", {
                    children: (
                      <input
                        id="apply-email"
                        data-testid="apply-email-input"
                        type="email"
                        className="form-input"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={set("email")}
                      />
                    ),
                  })}
                  {field("apply-city", "State / City", {
                    children: (
                      <input
                        id="apply-city"
                        data-testid="apply-city-input"
                        className="form-input"
                        placeholder="e.g. Bangalore"
                        value={form.city}
                        onChange={set("city")}
                      />
                    ),
                  })}
                  {field("apply-college", "Select College *", {
                    children: (
                      <select
                        id="apply-college"
                        data-testid="apply-college-select"
                        className="form-input"
                        value={form.college}
                        onChange={set("college")}
                      >
                        {COLLEGES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    ),
                  })}
                  {field("apply-program", "Select Program *", {
                    children: (
                      <select
                        id="apply-program"
                        data-testid="apply-program-select"
                        className="form-input"
                        value={form.program}
                        onChange={set("program")}
                      >
                        {PROGRAMS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    ),
                  })}
                </div>
                <div className="mt-5">
                  <label htmlFor="apply-message" className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Message
                  </label>
                  <textarea
                    id="apply-message"
                    data-testid="apply-message-input"
                    rows={3}
                    className="form-input resize-none"
                    placeholder="Any specific enquiry about admissions, seats or eligibility..."
                    value={form.message}
                    onChange={set("message")}
                  />
                </div>

                {error && (
                  <p data-testid="apply-error-alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-[#9F1239]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  data-testid="apply-submit-button"
                  disabled={status === "loading"}
                  className="group mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#BE185D] px-8 py-4 text-sm font-bold text-white shadow-xl shadow-rose-900/20 transition-all duration-300 hover:scale-[1.01] hover:bg-[#9F1239] disabled:cursor-not-allowed disabled:opacity-60"
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
          </div>
        </div>
      </div>
    </section>
  );
}
