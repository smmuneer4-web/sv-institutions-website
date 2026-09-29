import { useState } from "react";
import { Check, ArrowUpRight, Clock, GraduationCap, FileText } from "lucide-react";
import { Reveal, SectionHead } from "../components/Reveal";
import { prefillEnquiry, scrollToId } from "../lib/scroll";
import EnquiryModal from "../components/EnquiryModal";

const COURSES = [
  {
    id: 0,
    name: "B.Sc. Nursing",
    type: "Undergraduate",
    duration: "4 Years",
    seats: "60 Seats",
    eligibility: "PUC (Science) / 10+2",
    college: "S V College of Nursing",
    desc: "A transformative four-year journey blending strong theory with supervised hospital rotations.",
    highlights: ["Comprehensive clinical training", "Supervised hospital rotations", "Research & public health ethics"],
    testid: "course-card-bsc",
  },
  {
    id: 1,
    name: "M.Sc. Nursing",
    type: "Postgraduate",
    duration: "2 Years",
    seats: "25 Seats",
    eligibility: "B.Sc Nursing graduates",
    college: "S V College of Nursing",
    desc: "Take your nursing career to new heights — choose your specialization and gain advanced skills and knowledge.",
    highlights: ["Advanced nursing specialties", "Leadership & clinical administration", "Evidence-based research"],
    testid: "course-card-msc",
  },
  {
    id: 2,
    name: "GNM (DGNM)",
    type: "Diploma",
    duration: "2 Years",
    seats: "50 Seats",
    eligibility: "10+2 / PUC",
    college: "D R Vijayakumari School of Nursing",
    desc: "Prepares nurses to perform effectively as core healthcare team members in hospitals, nursing homes and healthcare organisations.",
    highlights: ["Core healthcare team competency", "Bedside care & midwifery", "Practical clinical rotations"],
    testid: "course-card-gnm",
  },
];

export default function Courses() {
  const [feesOpen, setFeesOpen] = useState(false);
  const apply = (c) => {
    prefillEnquiry({ college: c.college, program: c.name });
    scrollToId("#apply");
  };
  const fees = () => setFeesOpen(true);

  return (
    <section id="courses" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <SectionHead
          eyebrow="Academic Programs"
          title={
            <>
              Choose your path
              <br />
              <span className="italic text-[#BE185D]">in nursing.</span>
            </>
          }
          sub="From undergraduate degrees to postgraduate specialisation and diploma training — every program combines rigorous academics with real hospital experience."
        />

        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {COURSES.map((c, i) => (
            <Reveal key={c.id} delay={0.08 * i} className="h-full">
              <div
                data-testid={c.testid}
                className="group flex h-full flex-col rounded-3xl border border-rose-100 bg-white p-8 transition-all duration-500 hover:-translate-y-2 hover:border-[#BE185D]/40 hover:shadow-2xl hover:shadow-rose-100/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0F766E]">
                    <GraduationCap className="h-3.5 w-3.5" /> {c.type}
                  </span>
                  <span className="rounded-full bg-[#BE185D] px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-rose-200">
                    {c.seats}
                  </span>
                </div>

                <h3 className="mt-6 font-display text-4xl font-semibold text-[#22090F]">{c.name}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{c.desc}</p>

                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-rose-100 py-4 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#0D9488]" /> {c.duration}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#0D9488]" /> {c.eligibility}
                  </span>
                </div>

                <ul className="mt-5 flex-1 space-y-2.5">
                  {c.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#BE185D]" />
                      {h}
                    </li>
                  ))}
                </ul>

                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">{c.college}</p>

                <button
                  data-testid={`course-apply-btn-${c.id}`}
                  onClick={() => apply(c)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#BE185D] px-6 py-3 text-sm font-bold text-[#BE185D] transition-all duration-300 hover:bg-[#BE185D] hover:text-white"
                >
                  Apply for this Course <ArrowUpRight className="h-4 w-4" />
                </button>
                <button
                  data-testid={`course-fees-btn-${c.id}`}
                  onClick={fees}
                  className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#0D9488] px-6 py-3 text-sm font-bold text-[#0F766E] transition-all duration-300 hover:bg-[#0D9488] hover:text-white"
                >
                  Fees Structure <FileText className="h-4 w-4" />
                </button>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <EnquiryModal open={feesOpen} onClose={() => setFeesOpen(false)} />
    </section>
  );
}
