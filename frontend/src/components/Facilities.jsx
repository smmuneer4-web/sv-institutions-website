import { Building2, BookOpen, FlaskConical, BedDouble, Bus, Stethoscope } from "lucide-react";
import { Reveal, SectionHead } from "../components/Reveal";

const HOSTEL_IMG =
  "https://images.unsplash.com/photo-1769147555720-71fc71bfc216?q=80&w=1600&auto=format&fit=crop";

const ImageTile = ({ src, title, text, testid, className = "" }) => (
  <div
    data-testid={testid}
    className={`group relative overflow-hidden rounded-3xl ${className}`}
  >
    <img
      src={src}
      alt={title}
      loading="lazy"
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-[#22090F]/85 via-[#22090F]/25 to-transparent" />
    <div className="relative flex h-full flex-col justify-end p-8">
      <h3 className="font-display text-2xl font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/75">{text}</p>
    </div>
  </div>
);

const BrandTile = ({ icon: Icon, title, text, testid, className = "" }) => (
  <div
    data-testid={testid}
    className={`group relative flex flex-col justify-end overflow-hidden rounded-3xl bg-[#6E0A28] p-8 ${className}`}
  >
    <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#BE185D]/30 blur-3xl transition-all duration-700 group-hover:bg-[#BE185D]/50" />
    <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:18px_18px]" />
    <div className="relative">
      <div className="inline-flex rounded-2xl bg-white/10 p-3.5 text-white ring-1 ring-white/25 backdrop-blur">
        <Icon className="h-6 w-6" strokeWidth={1.8} />
      </div>
      <h3 className="mt-6 font-display text-2xl font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/75">{text}</p>
    </div>
  </div>
);

const TextTile = ({ icon: Icon, title, text, testid, className = "" }) => (
  <div
    data-testid={testid}
    className={`group rounded-3xl border border-rose-100 bg-white p-8 transition-all duration-500 hover:-translate-y-1.5 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-50 ${className}`}
  >
    <div className="inline-flex rounded-2xl bg-teal-50 p-3.5 text-[#0F766E] transition-colors duration-500 group-hover:bg-[#BE185D] group-hover:text-white">
      <Icon className="h-6 w-6" strokeWidth={1.8} />
    </div>
    <h3 className="mt-6 text-lg font-bold text-[#22090F]">{title}</h3>
    <p className="mt-3 text-sm leading-relaxed text-slate-600">{text}</p>
  </div>
);

export default function Facilities() {
  return (
    <section id="facilities" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <SectionHead
          eyebrow="Campus & Facilities"
          title={
            <>
              Infrastructure that trains
              <br />
              <span className="italic text-[#BE185D]">real, hands-on care.</span>
            </>
          }
          sub="Labs, libraries, hostels and hospital tie-ups — everything a future nurse needs to learn by doing."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-6">
          <Reveal className="lg:col-span-3 lg:row-span-2">
            <BrandTile
              testid="facility-tile-labs"
              icon={Stethoscope}
              title="Advanced Nursing Simulation Labs"
              text="High-fidelity mannequins and clinical skill stations for real-world patient care practice."
              className="h-96 lg:h-full lg:min-h-[30rem]"
            />
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-3">
            <TextTile
              testid="facility-tile-hospitals"
              icon={Building2}
              title="Multi-Specialty Hospital Tie-ups"
              text="Direct clinical postings in leading super-specialty hospitals across Bengaluru."
              className="h-full"
            />
          </Reveal>
          <Reveal delay={0.12} className="lg:col-span-3">
            <TextTile
              testid="facility-tile-library"
              icon={BookOpen}
              title="Digital Health Library & Research Hub"
              text="Thousands of medical journals, e-books and online databases for nursing research."
              className="h-full"
            />
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-2">
            <TextTile
              testid="facility-tile-anatomy"
              icon={FlaskConical}
              title="Anatomy & Physiology Labs"
              text="Modern instruments, 3D anatomical models and biochemical analysis stations."
              className="h-full"
            />
          </Reveal>
          <Reveal delay={0.12} className="lg:col-span-2">
            <ImageTile
              testid="facility-tile-hostels"
              src={HOSTEL_IMG}
              title="Safe Campus Hostels"
              text="Separate secure residential facilities for female and male students with 24/7 security."
              className="h-72 lg:h-full"
            />
          </Reveal>
          <Reveal delay={0.16} className="lg:col-span-2">
            <TextTile
              testid="facility-tile-transport"
              icon={Bus}
              title="Prime Connectivity"
              text="At Mallathahalli Bus Stop on 80 Feet Ring Road, right beside Bangalore University."
              className="h-full"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
