import { motion } from "framer-motion";

export const Reveal = ({ children, delay = 0, y = 30, className = "" }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
  >
    {children}
  </motion.div>
);

export const SectionHead = ({ eyebrow, title, sub, dark = false }) => (
  <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
    <div className="max-w-2xl">
      <Reveal>
        <p className={`eyebrow ${dark ? "text-teal-300" : "text-teal-700"}`}>{eyebrow}</p>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 className={`section-title mt-4 font-display font-semibold ${dark ? "text-white" : "text-[#22090F]"}`}>
          {title}
        </h2>
      </Reveal>
    </div>
    {sub && (
      <Reveal delay={0.16} className="max-w-md">
        <p className={`text-base leading-relaxed ${dark ? "text-white/70" : "text-slate-600"}`}>{sub}</p>
      </Reveal>
    )}
  </div>
);
