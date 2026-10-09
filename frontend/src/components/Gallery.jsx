import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Reveal, SectionHead } from "../components/Reveal";
import { useLenisStop } from "../lib/scroll";
import { useContent } from "../lib/content";
import Reels from "./Reels";

export default function Gallery() {
  const [lightbox, setLightbox] = useState(null);
  const content = useContent();
  useLenisStop(!!lightbox);

  const photos = content.gallery.photos.map((p) => ({
    img: p.img || p.url,
    caption: p.caption,
    tag: p.tag || "Campus",
  }));

  return (
    <section id="gallery" className="bg-gradient-to-b from-transparent via-rose-50/50 to-transparent py-20 lg:py-28">
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

        <Reveal delay={0.1}>
          <Reels />
        </Reveal>

        <div className="mt-10 grid grid-cols-3 gap-1.5 sm:gap-2.5">
          {photos.map((img, i) => (
            <Reveal key={img.img || i} delay={0.06 * i}>
              <button
                data-testid={`gallery-tile-${i}`}
                onClick={() => setLightbox(img)}
                className="group relative block aspect-square w-full overflow-hidden rounded-lg bg-rose-50 sm:rounded-xl"
              >
                <img
                  src={img.img}
                  alt={img.caption}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-[#22090F]/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <p className="w-full p-3 text-left font-display text-[12.5px] font-medium leading-snug text-white sm:p-4">{img.caption}</p>
                </div>
              </button>
            </Reveal>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400 sm:hidden">Tap a photo to view.</p>
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
              <img src={lightbox.img} alt={lightbox.caption} className="max-h-[75vh] w-full object-cover" />
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