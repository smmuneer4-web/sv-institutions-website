import { Stethoscope, MapPin, HeartPulse } from "lucide-react";
import { Reveal, SectionHead } from "@/components/Reveal";

const CORRIDOR_IMG =
  "https://images.unsplash.com/photo-1719934398679-d764c1410770?q=80&w=1600&auto=format&fit=crop";

const VALUES = [
  {
    icon: Stethoscope,
    title: "Hands-on Clinical Exposure",
    text: "Hospital rotations and multi-specialty clinical postings that turn theory into confident bedside practice.",
  },
  {
    icon: HeartPulse,
    title: "Holistic Care Ethos",
    text: "We form competent, caring nursing professionals who excel in providing holistic care to individuals and communities.",
  },
  {
    icon: MapPin,
    title: "Prime Location",
    text: "80 Feet Ring Road, near Bangalore University at Mallathahalli — connected, safe and campus-friendly.",
  },
];

export default function About() {
  return (
    <section id="about" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <SectionHead
          eyebrow="About the Institution"
          title={
            <>
              Rooted in care,
              <br />
              <span className="italic text-[#BE185D]">built on excellence.</span>
            </>
          }
          sub="A pioneering institution dedicated to high-quality education in nursing and paramedical sciences, shaping healthcare professionals for diverse clinical settings."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <div
              data-testid="about-main-card"
              className="group flex h-full flex-col justify-between gap-8 overflow-hidden rounded-3xl border border-rose-100 bg-white p-8 transition-shadow duration-500 hover:shadow-xl hover:shadow-rose-100 lg:flex-row lg:p-10"
            >
              <div className="max-w-xl">
                <p className="eyebrow text-teal-700">Who we are</p>
                <p className="mt-5 font-display text-2xl font-medium leading-snug text-[#22090F] sm:text-[1.7rem]">
                  "S V College of Nursing is a pioneering institution dedicated to providing high-quality
                  education in the nursing sciences."
                </p>
                <p className="mt-5 text-base leading-relaxed text-slate-600">
                  Affiliated with Rajiv Gandhi University of Health Sciences, Karnataka, and recognised by the
                  Karnataka Nursing &amp; Paramedical Sciences Education (Regulating) Authority and the Karnataka
                  State Nursing Council — affiliations that ensure our students receive the knowledge and skills
                  to excel in every healthcare setting.
                </p>
              </div>
              <div className="arch-frame overflow-hidden border-4 border-rose-50 lg:w-64 lg:shrink-0">
                <img
                  src={CORRIDOR_IMG}
                  alt="Modern hospital corridor"
                  loading="lazy"
                  className="h-56 w-full object-cover transition-transform duration-700 group-hover:scale-105 lg:h-full"
                />
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div
              data-testid="about-trust-card"
              className="flex h-full flex-col justify-between rounded-3xl bg-[#6E0A28] p-8 text-white lg:p-10"
            >
              <div>
                <p className="eyebrow text-teal-300">The Trust</p>
                <p className="mt-6 font-display text-6xl font-semibold italic text-white/95">2002</p>
                <p className="mt-5 text-base leading-relaxed text-white/75">
                  Managed by the Sandesh Educational Cultural and Charitable Trust — dedicated to the pursuit
                  of pure and scientific knowledge since 2002.
                </p>
              </div>
              <p className="mt-10 border-t border-white/15 pt-5 font-display text-lg italic text-teal-200">
                A Culture of Excellence in Learning
              </p>
            </div>
          </Reveal>

          {VALUES.map((v, i) => (
            <Reveal key={v.title} delay={0.08 * i}>
              <div
                data-testid={`about-value-card-${i}`}
                className="group h-full rounded-3xl border border-rose-100 bg-white p-8 transition-all duration-500 hover:-translate-y-1.5 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-50"
              >
                <div className="inline-flex rounded-2xl bg-teal-50 p-3.5 text-[#0F766E] transition-colors duration-500 group-hover:bg-[#BE185D] group-hover:text-white">
                  <v.icon className="h-6 w-6" strokeWidth={1.8} />
                </div>
                <h3 className="mt-6 text-lg font-bold text-[#22090F]">{v.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{v.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
