import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BadgeCheck, FileText, X, Download } from "lucide-react";
import { Reveal } from "../components/Reveal";
import { useLenisStop } from "../lib/scroll";

const BODIES = [
  {
    acronym: "RGUHS",
    full: "Rajiv Gandhi University of Health Sciences",
    type: "University Affiliation",
    place: "Karnataka, India",
    title: "RGUHS Approval Letter",
    docs: [{ label: "S V College of Nursing", src: "/approvals/rguhs-svcon.pdf" }],
  },
  {
    acronym: "KSNC",
    full: "Karnataka State Nursing Council",
    type: "State Statutory Body",
    place: "Bengaluru",
    title: "KSNC Approval Letters",
    docs: [
      { label: "S V College of Nursing", src: "/approvals/ksnc-svcon.pdf" },
      { label: "D R Vijayakumari School of Nursing", src: "/approvals/ksnc-drvson.pdf" },
    ],
  },
  {
    acronym: "INC",
    full: "Indian Nursing Council",
    type: "Apex National Body",
    place: "New Delhi",
    title: "INC Approval Letter",
    docs: [{ label: "S V College of Nursing", src: "/approvals/inc-svcon.pdf" }],
  },
];

export default function Affiliations() {
  const [viewer, setViewer] = useState(null);
  const [active, setActive] = useState(0);
  useLenisStop(!!viewer);

  const open = (b) => {
    setActive(0);
    setViewer({ title: b.title, docs: b.docs });
  };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setViewer(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const current = viewer?.docs[active];

  return (
    <section id="affiliations" className="relative overflow-hidden bg-[#6E0A28] py-20 lg:py-28">
      <div className="pointer-events-none absolute -left-32 bottom-0 h-96 w-96 rounded-full bg-rose-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-5 lg:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Reveal>
              <p className="eyebrow text-teal-300">Affiliations &amp; Recognitions</p>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="section-title mt-4 font-display font-semibold text-white">
                Affiliated. Recognised. <span className="italic text-rose-300">Approved.</span>
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.16} className="max-w-md">
            <p className="text-base leading-relaxed text-white/70">
              These affiliations ensure our students receive the knowledge and skills necessary to excel in
              diverse healthcare settings. Click a council card to view its official approval letter.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {BODIES.map((b, i) => (
            <Reveal key={b.acronym} delay={0.1 * i} className="h-full">
              <div
                data-testid={`affiliation-card-${b.acronym.toLowerCase()}`}
                onClick={() => open(b)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && open(b)}
                className="group h-full cursor-pointer rounded-3xl border border-white/15 bg-white/5 p-8 backdrop-blur transition-all duration-500 hover:-translate-y-1.5 hover:border-teal-300/60 hover:bg-white/10 hover:shadow-2xl hover:shadow-teal-900/40"
              >
                <div className="flex items-center justify-between">
                  <p className="font-display text-5xl font-semibold italic text-white">{b.acronym}</p>
                  <BadgeCheck className="h-6 w-6 text-teal-300" />
                </div>
                <p className="mt-6 text-base font-semibold leading-snug text-rose-100">{b.full}</p>
                <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-white/10 px-3 py-1.5 font-semibold text-white/80">{b.type}</span>
                  <span className="rounded-full bg-teal-400/15 px-3 py-1.5 font-semibold text-teal-200">{b.place}</span>
                </div>
                <span
                  data-testid={`affiliation-view-approval-${b.acronym.toLowerCase()}`}
                  className="mt-7 inline-flex items-center gap-2 rounded-full border border-teal-300/40 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-teal-200 transition-all duration-300 group-hover:bg-teal-300 group-hover:text-[#6E0A28]"
                >
                  <FileText className="h-3.5 w-3.5" /> View Approval
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {viewer && current && (
          <motion.div
            data-testid="approval-pdf-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-[#22090F]/80 p-4 backdrop-blur-md sm:p-8"
            onClick={() => setViewer(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 30 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              data-lenis-prevent className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-100 bg-[#6E0A28] px-6 py-4">
                <p className="font-display text-xl font-semibold text-white">{viewer.title}</p>
                <div className="flex items-center gap-3">
                  <a
                    href={current.src}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="approval-pdf-open-tab-link"
                    className="hidden text-xs font-bold text-white/80 underline-offset-4 hover:text-white hover:underline sm:inline"
                  >
                    Open in new tab
                  </a>
                  <a
                    href={current.src}
                    download
                    data-testid="approval-pdf-download-link"
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                  <button
                    data-testid="approval-pdf-close-button"
                    onClick={() => setViewer(null)}
                    aria-label="Close certificate viewer"
                    className="rounded-full border border-white/25 p-2 text-white transition-colors hover:bg-white/10"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {viewer.docs.length > 1 && (
                <div className="flex gap-2 border-b border-rose-100 bg-rose-50/60 px-6 py-3">
                  {viewer.docs.map((d, i) => (
                    <button
                      key={d.src}
                      data-testid={`approval-doc-tab-${i}`}
                      onClick={() => setActive(i)}
                      className={`rounded-full px-4 py-2 text-xs font-bold transition-all duration-300 ${
                        i === active
                          ? "bg-[#BE185D] text-white shadow-md shadow-rose-200"
                          : "text-[#9F1239] hover:bg-rose-100"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              )}

              <iframe
                key={current.src}
                data-testid="approval-pdf-frame"
                src={current.src}
                title={`${viewer.title} — ${current.label}`}
                className="h-full w-full flex-1 bg-slate-100"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
