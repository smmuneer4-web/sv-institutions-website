import { useRef, useState } from "react";
import { motion, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion";
import { ArrowUpRight, Plus } from "lucide-react";
import { scrollToId } from "../lib/scroll";
import EnquiryModal from "../components/EnquiryModal";
import { useContent } from "../lib/content";

const line = (i) => ({
  initial: { y: "115%" },
  animate: { y: "0%" },
  transition: { duration: 1.05, delay: 0.25 + i * 0.13, ease: [0.16, 1, 0.3, 1] },
});

const fade = (d) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay: d, ease: [0.16, 1, 0.3, 1] },
});

export default function Hero() {
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const content = useContent();
  const hero = content.hero;
  const imgRef = useRef(null);
  const sectionRef = useRef(null);
  const rotX = useSpring(useMotionValue(0), { stiffness: 120, damping: 18 });
  const rotY = useSpring(useMotionValue(0), { stiffness: 120, damping: 18 });
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], [0, 70]);
  const blobY = useTransform(scrollYProgress, [0, 1], [0, -50]);

  const onMove = (e) => {
    const r = imgRef.current?.getBoundingClientRect();
    if (!r) return;
    rotY.set(((e.clientX - r.left) / r.width - 0.5) * 9);
    rotX.set(-((e.clientY - r.top) / r.height - 0.5) * 9);
  };
  const onLeave = () => {
    rotX.set(0);
    rotY.set(0);
  };

  return (
    <section id="top" ref={sectionRef} className="relative overflow-hidden pb-20 pt-32 lg:pt-40">
      <motion.div
        style={{ y: blobY }}
        className="pointer-events-none absolute -left-40 top-10 h-[34rem] w-[34rem] rounded-full bg-rose-100/70 blur-3xl"
      />
      <div className="pointer-events-none absolute -right-52 top-64 h-[30rem] w-[30rem] rounded-full bg-teal-100/60 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-12 lg:gap-8 lg:px-10">
        <div className="lg:col-span-6">
          <motion.div {...fade(0.1)}>
            <span
              data-testid="hero-admissions-badge"
              className="inline-flex items-center gap-2.5 rounded-full border border-rose-200 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#BE185D] backdrop-blur"
            >
              <span className="pulse-dot h-2 w-2 rounded-full bg-teal-600" />
              Admissions Open
            </span>
          </motion.div>

          <motion.p {...fade(0.15)} className="eyebrow mt-8 text-teal-700">
            S V Group of Institutions · Bangalore
          </motion.p>

          <h1 className="hero-title mt-5 font-display font-semibold text-[#22090F]">
            {hero.headline_lines.map((l, i) => (
              <span key={i} className="block overflow-hidden pb-1">
                <motion.span {...line(i)} className="block">
                  <span className={`block ${i === 1 ? "italic text-[#BE185D]" : ""}`}>{l}</span>
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p {...fade(0.65)} className="mt-7 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
            {hero.sub}
          </motion.p>

          <motion.div {...fade(0.8)} className="mt-9 flex flex-wrap items-center gap-4">
            <button
              data-testid="hero-enquire-btn"
              onClick={() => setEnquiryOpen(true)}
              className="group inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-8 py-4 text-sm font-semibold text-white shadow-xl shadow-rose-900/25 transition-all duration-300 hover:scale-[1.04] hover:bg-[#9F1239]"
            >
              Enquire Now
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </button>
            <button
              data-testid="hero-programs-btn"
              onClick={() => scrollToId("#courses")}
              className="inline-flex items-center gap-2 rounded-full border border-[#22090F]/15 bg-white/60 px-8 py-4 text-sm font-semibold text-[#22090F] backdrop-blur transition-all duration-300 hover:border-[#0D9488] hover:text-[#0F766E]"
            >
              Explore Programs
            </button>
          </motion.div>

          <motion.div {...fade(0.95)} className="mt-12 flex flex-wrap gap-10 border-t border-rose-100 pt-8">
            {hero.stats.map((s) => (
              <div key={s.l}>
                <p className="font-display text-4xl font-semibold text-[#BE185D]">
                  {s.n}
                  {s.n === "135" && <span className="text-2xl">+</span>}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{s.l}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="relative lg:col-span-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ y: imgY, perspective: 1000 }}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            className="relative mx-auto max-w-[30rem]"
          >
            <motion.div
              ref={imgRef}
              data-testid="hero-image-card"
              style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }}
              className="arch-frame relative overflow-hidden border-[6px] border-white shadow-2xl shadow-rose-900/25"
            >
              <video
                data-testid="hero-video"
                poster={hero.poster_url}
                autoPlay
                muted
                loop
                playsInline
                className="h-[30rem] w-full object-cover sm:h-[34rem]"
              >
                {[...new Set([hero.video_url, "/hero.mp4", "/hero.webm"])].filter(Boolean).map((src) => (
                  <source key={src} src={src} type={src.endsWith(".webm") ? "video/webm" : "video/mp4"} />
                ))}
              </video>
              <div className="absolute inset-0 bg-gradient-to-t from-[#6E0A28]/35 via-transparent to-transparent" />
            </motion.div>

            <motion.div
              {...fade(1.1)}
              style={{ transform: "translateZ(60px)" }}
              className="spin-slow absolute -left-10 -top-8 hidden h-32 w-32 items-center justify-center rounded-full bg-white shadow-xl shadow-rose-900/15 ring-1 ring-rose-100 sm:flex"
            >
              <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
                <defs>
                  <path id="circlePath" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
                </defs>
                <text className="fill-[#9F1239]" style={{ fontSize: "8.2px", letterSpacing: "2.4px", fontWeight: 700 }}>
                  <textPath href="#circlePath">S V GROUP OF INSTITUTIONS • NURSING •</textPath>
                </text>
              </svg>
              <Plus className="h-6 w-6 text-[#0D9488]" strokeWidth={3} />
            </motion.div>

            <motion.div
              {...fade(1.2)}
              style={{ transform: "translateZ(80px)" }}
              data-testid="hero-intake-card"
              className="glass-card absolute -bottom-8 -left-4 w-64 rounded-3xl p-5 sm:-left-14"
            >
              <p className="eyebrow text-[10px] text-[#BE185D]">Sanctioned Intake</p>
              <div className="mt-3 space-y-2">
                {[
                  { p: "B.Sc Nursing", s: "60" },
                  { p: "M.Sc Nursing", s: "25" },
                  { p: "GNM (DGNM)", s: "50" },
                ].map((r) => (
                  <div key={r.p} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-600">{r.p}</span>
                    <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-[#0F766E]">{r.s}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
      <EnquiryModal open={enquiryOpen} onClose={() => setEnquiryOpen(false)} />
    </section>
  );
}
