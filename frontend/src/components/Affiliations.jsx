import { BadgeCheck } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const BODIES = [
  {
    acronym: "RGUHS",
    full: "Rajiv Gandhi University of Health Sciences",
    type: "University Affiliation",
    place: "Karnataka, India",
  },
  {
    acronym: "KSNC",
    full: "Karnataka State Nursing Council",
    type: "State Statutory Body",
    place: "Bengaluru",
  },
  {
    acronym: "INC",
    full: "Indian Nursing Council",
    type: "Apex National Body",
    place: "New Delhi",
  },
];

export default function Affiliations() {
  return (
    <section id="affiliations" className="relative overflow-hidden bg-[#6E0A28] py-24 lg:py-32">
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
              diverse healthcare settings.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {BODIES.map((b, i) => (
            <Reveal key={b.acronym} delay={0.1 * i} className="h-full">
              <div
                data-testid={`affiliation-card-${b.acronym.toLowerCase()}`}
                className="group h-full rounded-3xl border border-white/15 bg-white/5 p-8 backdrop-blur transition-all duration-500 hover:-translate-y-1.5 hover:border-teal-300/40 hover:bg-white/10"
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
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
