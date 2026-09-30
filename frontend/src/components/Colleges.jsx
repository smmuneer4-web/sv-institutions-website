import { ArrowRight } from "lucide-react";
import { Reveal, SectionHead } from "../components/Reveal";
import { scrollToId } from "../lib/scroll";

const COLLEGES = [
  {
    id: "sv",
    monogram: "SV",
    color: "#BE185D",
    tag: "Campus 2 · Degree & Postgraduate",
    name: "S V College of Nursing",
    desc: "Renowned across India for its excellence in nursing education, affiliated to Rajiv Gandhi University of Health Sciences and recognised by INC & KSNC.",
    programs: ["B.Sc Nursing", "M.Sc Nursing"],
    testid: "college-card-sv",
  },
  {
    id: "dv",
    monogram: "DV",
    color: "#0D9488",
    tag: "Campus 2 · Diploma",
    name: "D R Vijayakumari School of Nursing",
    desc: "Dedicated to producing competent and caring nursing professionals who excel in providing holistic care to individuals and communities, recognised by KSNC.",
    programs: ["DGNM (GNM)"],
    testid: "college-card-dv",
  },
];

export default function Colleges() {
  return (
    <section id="colleges" className="bg-gradient-to-b from-transparent via-rose-50/50 to-transparent py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <SectionHead
          eyebrow="Our Institutions"
          title={
            <>
              Two colleges.
              <br />
              <span className="italic text-[#BE185D]">One standard of care.</span>
            </>
          }
          sub="Under the S V Group of Institutions, Campus 2 houses our nursing colleges — each with its own legacy of clinical rigour and compassionate teaching."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {COLLEGES.map((c, i) => (
            <Reveal key={c.id} delay={0.1 * i}>
              <div
                data-testid={c.testid}
                className="group relative h-full overflow-hidden rounded-3xl border border-rose-100 bg-white p-8 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-rose-100/80 lg:p-10"
              >
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-[0.06] transition-transform duration-700 group-hover:scale-150"
                  style={{ background: c.color }}
                />
                <div className="flex items-start justify-between gap-4">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl font-display text-2xl font-semibold text-white shadow-lg"
                    style={{ background: c.color, boxShadow: `0 16px 30px -12px ${c.color}80` }}
                  >
                    {c.monogram}
                  </div>
                  <span className="rounded-full border border-rose-100 bg-rose-50/60 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9F1239]">
                    {c.tag}
                  </span>
                </div>
                <h3 className="mt-7 font-display text-3xl font-semibold text-[#22090F]">{c.name}</h3>
                <p className="mt-4 text-base leading-relaxed text-slate-600">{c.desc}</p>
                <div className="mt-7 flex flex-wrap gap-2.5">
                  {c.programs.map((p) => (
                    <span
                      key={p}
                      className="rounded-full bg-teal-50 px-4 py-1.5 text-xs font-bold text-[#0F766E]"
                    >
                      {p}
                    </span>
                  ))}
                </div>
                <button
                  data-testid={`${c.testid}-programs-link`}
                  onClick={() => scrollToId("#courses")}
                  className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#BE185D] transition-colors hover:text-[#9F1239]"
                >
                  View Programs
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
