import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, Plus, ChevronDown } from "lucide-react";
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
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.14]);
  const videoY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <section id="top" ref={sectionRef} className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-[#22090F]">
      {/* Cinematic video layer */}
      <motion.div style={{ scale: videoScale, y: videoY }} className="absolute inset-0" data-testid="hero-video-backdrop">
        <video
          key={hero.video_url}
          data-testid="hero-video"
          poster={hero.poster_url}
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover"
        >
          {[...new Set([hero.video_url, "/hero.mp4", "/hero.webm"])].filter(Boolean).map((src) => (
            <source key={src} src={src} type={src.endsWith(".webm") ? "video/webm" : "video/mp4"} />
          ))}
        </video>
      </motion.div>

      {/* Cinematic overlays: readability gradients + vignette + grain */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#22090F]/85 via-[#22090F]/35 to-[#22090F]/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#22090F] via-[#22090F]/25 to-[#22090F]/45" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage: "radial-gradient(#fff 0.5px, transparent 0.5px)",
          backgroundSize: "5px 5px",
          mixBlendMode: "overlay",
        }}
      />
      <div className="pointer-events-none absolute inset-0 [box-shadow:inset_0_0_14rem_rgba(34,9,15,0.85)]" />

      {/* Story content */}
      <motion.div style={{ opacity: contentOpacity }} className="relative mx-auto w-full max-w-7xl px-5 pb-44 pt-36 sm:pb-48 lg:px-10">
        <motion.div {...fade(0.1)}>
          <span
            data-testid="hero-admissions-badge"
            className="inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md"
          >
            <span className="pulse-dot h-2 w-2 rounded-full bg-teal-300" />
            Admissions Open
          </span>
        </motion.div>

        <motion.p {...fade(0.15)} className="eyebrow mt-8 text-teal-300">
          S V Group of Institutions · Bangalore
        </motion.p>

        <h1 className="hero-title mt-5 font-display font-semibold text-white">
          {hero.headline_lines.map((l, i) => (
            <span key={i} className="block overflow-hidden pb-1">
              <motion.span {...line(i)} className="block">
                <span className={`block ${i === 1 ? "italic text-[#F471B5]" : ""}`}>{l}</span>
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p {...fade(0.65)} className="mt-7 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
          {hero.sub}
        </motion.p>

        <motion.div {...fade(0.8)} className="mt-9 flex flex-wrap items-center gap-4">
          <button
            data-testid="hero-enquire-btn"
            onClick={() => setEnquiryOpen(true)}
            className="group inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-8 py-4 text-sm font-semibold text-white shadow-xl shadow-rose-900/40 transition-all duration-300 hover:scale-[1.04] hover:bg-[#9F1239]"
          >
            Enquire Now
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </button>
          <button
            data-testid="hero-programs-btn"
            onClick={() => scrollToId("#courses")}
            className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-8 py-4 text-sm font-semibold text-white backdrop-blur-md transition-all duration-300 hover:border-teal-300/60 hover:text-teal-200"
          >
            Explore Programs
          </button>
        </motion.div>
      </motion.div>

      {/* Spinning seal — brand touch, floats right */}
      <motion.div
        {...fade(1.1)}
        className="spin-slow absolute right-16 top-36 hidden h-32 w-32 items-center justify-center rounded-full bg-white/95 shadow-xl shadow-rose-900/30 ring-1 ring-white/40 lg:flex"
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

      {/* Bottom band: stats + intake + scroll cue */}
      <div className="absolute inset-x-0 bottom-0 z-10 border-t border-white/10 bg-[#22090F]/55 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-6 px-5 py-6 lg:px-10">
          <motion.div {...fade(0.95)} className="flex flex-wrap gap-10">
            {hero.stats.map((s) => (
              <div key={s.l} data-testid="hero-intake-card">
                <p className="font-display text-4xl font-semibold text-white">
                  {s.n}
                  {s.n === "135" && <span className="text-2xl">+</span>}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">{s.l}</p>
              </div>
            ))}
          </motion.div>
          <motion.button
            {...fade(1.2)}
            data-testid="hero-scroll-cue"
            onClick={() => scrollToId("#about")}
            aria-label="Scroll to about"
            className="hidden flex-col items-center gap-1 text-white/60 transition-colors hover:text-white sm:flex"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.22em]">Scroll</span>
            <motion.span animate={{ y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
              <ChevronDown className="h-4 w-4" />
            </motion.span>
          </motion.button>
        </div>
      </div>

      <EnquiryModal open={enquiryOpen} onClose={() => setEnquiryOpen(false)} />
    </section>
  );
}
