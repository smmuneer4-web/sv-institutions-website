import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Reveal, SectionHead } from "./Reveal";
import { useContent } from "../lib/content";

export default function Faq() {
  const content = useContent();
  const items = content?.faq?.items || [];
  const [open, setOpen] = useState(0);

  useEffect(() => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: items
        .filter((it) => it.q && it.a)
        .map((it) => ({
          "@type": "Question",
          name: it.q,
          acceptedAnswer: { "@type": "Answer", text: it.a },
        })),
    };
    let el = document.getElementById("faq-schema");
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.id = "faq-schema";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(schema);
  }, [items]);

  if (!items.length) return null;

  return (
    <section id="faq" data-testid="faq-section" className="bg-gradient-to-b from-[#FFFDF9] to-rose-50/40 py-20 lg:py-28">
      <div className="mx-auto max-w-4xl px-5 lg:px-10">
        <SectionHead
          eyebrow="Admissions FAQ"
          title={
            <>
              Questions parents ask us,
              <br />
              <span className="italic text-[#BE185D]">answered plainly.</span>
            </>
          }
          sub="Courses, recognition, hostel and how to apply — everything about nursing admission at S V College of Nursing, Bengaluru."
        />
        <div className="mt-12 space-y-3">
          {items.map((it, i) => (
            <Reveal key={i} delay={i * 0.04}>
              <div
                data-testid={`faq-item-${i}`}
                className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
                  open === i ? "border-rose-200 bg-white shadow-lg shadow-rose-100/60" : "border-rose-100 bg-white/70 hover:bg-white"
                }`}
              >
                <button
                  type="button"
                  data-testid={`faq-question-${i}`}
                  aria-expanded={open === i}
                  onClick={() => setOpen(open === i ? -1 : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-display text-lg font-semibold text-[#22090F]">{it.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-[#BE185D] transition-transform duration-300 ${open === i ? "rotate-180" : ""}`}
                  />
                </button>
                <div className={`grid transition-all duration-300 ${open === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                  <div className="overflow-hidden">
                    <p data-testid={`faq-answer-${i}`} className="px-6 pb-6 text-sm leading-relaxed text-slate-600">
                      {it.a}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}