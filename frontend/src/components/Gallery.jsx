import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Reveal, SectionHead } from "@/components/Reveal";

const IMAGES = [
  {
    src: "https://images.pexels.com/photos/35645510/pexels-photo-35645510.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    caption: "Skill lab — supervised phlebotomy practice",
    tag: "Labs",
    span: "md:col-span-2",
  },
  {
    src: "https://images.unsplash.com/photo-1517120026326-d87759a7b63b?q=80&w=1200&auto=format&fit=crop",
    caption: "Hospital postings — neonatal intensive care",
    tag: "Hospital Training",
    span: "",
  },
  {
    src: "https://images.unsplash.com/photo-1709805619372-40de3f158e83?q=80&w=1200&auto=format&fit=crop",
    caption: "Campus hostel accommodation",
    tag: "Hostels",
    span: "",
  },
  {
    src: "https://images.pexels.com/photos/35645506/pexels-photo-35645506.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    caption: "Clinical procedures under faculty supervision",
    tag: "Labs",
    span: "",
  },
  {
    src: "https://images.unsplash.com/photo-1762512346988-045f4d5ad2b3?q=80&w=1200&auto=format&fit=crop",
    caption: "Digital health library & study hall",
    tag: "Library",
    span: "",
  },
  {
    src: "https://images.unsplash.com/photo-1586534738560-438efdf1d205?q=80&w=1200&auto=format&fit=crop",
    caption: "Ward rounds and hands-on hospital exposure",
    tag: "Hospital Training",
    span: "md:col-span-2",
  },
];

export default function Gallery() {
  const [lightbox, setLightbox] = useState(null);

  return (
    <section id="gallery" className="bg-gradient-to-b from-transparent via-rose-50/50 to-transparent py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <SectionHead
          eyebrow="Life @ S V"
          title={
            <>
              Campus life,
              <br />
              <span className="italic text-[#BE185D]">in action.</span>
            </>
          }
          sub="Labs, hostels and hospital training — a glimpse of the everyday moments that shape our students into confident nursing professionals."
        />

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {IMAGES.map((img, i) => (
            <Reveal key={img.src} delay={0.06 * i} className={img.span}>
              <button
                data-testid={`gallery-tile-${i}`}
                onClick={() => setLightbox(img)}
                className="group relative block h-64 w-full overflow-hidden rounded-3xl md:h-72"
              >
                <img
                  src={img.src}
                  alt={img.caption}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#22090F]/80 via-transparent to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5 text-left">
                  <p className="max-w-[80%] font-display text-lg font-medium leading-snug text-white">{img.caption}</p>
                  <span className="rounded-full bg-teal-400/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#22090F]">
                    {img.tag}
                  </span>
                </div>
              </button>
            </Reveal>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            data-testid="gallery-lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-[#22090F]/90 p-5 backdrop-blur-md"
            onClick={() => setLightbox(null)}
          >
            <motion.figure
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <img src={lightbox.src} alt={lightbox.caption} className="max-h-[75vh] w-full object-cover" />
              <figcaption className="flex items-center justify-between gap-4 px-6 py-4">
                <p className="font-display text-xl font-medium text-[#22090F]">{lightbox.caption}</p>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#0F766E]">
                  {lightbox.tag}
                </span>
              </figcaption>
              <button
                data-testid="gallery-lightbox-close-button"
                onClick={() => setLightbox(null)}
                aria-label="Close photo"
                className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-[#22090F] shadow-lg transition-transform hover:scale-105"
              >
                <X className="h-5 w-5" />
              </button>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
