import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Instagram, Heart, MessageCircle } from "lucide-react";
import { Reveal, SectionHead } from "../components/Reveal";
import { useLenisStop } from "../lib/scroll";

const INSTAGRAM_HANDLE = "svinstitutions";
const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}`;

const IMAGES = [
  {
    src: "https://images.pexels.com/photos/35645510/pexels-photo-35645510.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    caption: "Skill lab — supervised phlebotomy practice",
    tag: "Labs",
  },
  {
    src: "https://images.unsplash.com/photo-1517120026326-d87759a7b63b?q=80&w=1200&auto=format&fit=crop",
    caption: "Hospital postings — neonatal intensive care",
    tag: "Hospital Training",
  },
  {
    src: "https://images.unsplash.com/photo-1709805619372-40de3f158e83?q=80&w=1200&auto=format&fit=crop",
    caption: "Campus hostel accommodation",
    tag: "Hostels",
  },
  {
    src: "https://images.pexels.com/photos/35645506/pexels-photo-35645506.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    caption: "Clinical procedures under faculty supervision",
    tag: "Labs",
  },
  {
    src: "https://images.unsplash.com/photo-1762512346988-045f4d5ad2b3?q=80&w=1200&auto=format&fit=crop",
    caption: "Digital health library & study hall",
    tag: "Library",
  },
  {
    src: "https://images.unsplash.com/photo-1586534738560-438efdf1d205?q=80&w=1200&auto=format&fit=crop",
    caption: "Ward rounds and hands-on hospital exposure",
    tag: "Hospital Training",
  },
];

export default function Gallery() {
  const [lightbox, setLightbox] = useState(null);
  useLenisStop(!!lightbox);

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
          <a
            data-testid="gallery-instagram-link"
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-10 flex items-center justify-between gap-4 rounded-2xl border border-rose-100 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-3.5">
              <span className="rounded-full bg-gradient-to-tr from-[#F59E0B] via-[#BE185D] to-[#6E0A28] p-[3px]">
                <img src="/sv-logo.png" alt="Instagram profile" className="h-11 w-11 rounded-full border-2 border-white object-cover" />
              </span>
              <span>
                <span className="block text-sm font-bold text-[#22090F]">S V Group of Institutions</span>
                <span className="block text-xs font-medium text-slate-400">@{INSTAGRAM_HANDLE} · Campus feed</span>
              </span>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#BE185D] to-[#9F1239] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-200 transition-transform hover:scale-[1.03]">
              <Instagram className="h-4 w-4" /> Follow
            </span>
          </a>
        </Reveal>

        <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2.5">
          {IMAGES.map((img, i) => (
            <Reveal key={img.src} delay={0.06 * i}>
              <button
                data-testid={`gallery-tile-${i}`}
                onClick={() => setLightbox(img)}
                className="group relative block aspect-square w-full overflow-hidden rounded-lg bg-rose-50 sm:rounded-xl"
              >
                <img
                  src={img.src}
                  alt={img.caption}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#22090F]/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="flex items-center gap-4 text-white">
                    <span className="flex items-center gap-1.5 text-xs font-bold"><Heart className="h-4 w-4 fill-white" /></span>
                    <span className="flex items-center gap-1.5 text-xs font-bold"><MessageCircle className="h-4 w-4 fill-white" /></span>
                  </div>
                  <p className="hidden max-w-[85%] text-center font-display text-[12.5px] font-medium leading-snug text-white sm:block">{img.caption}</p>
                </div>
                <span className="absolute right-2 top-2 text-white drop-shadow transition-opacity duration-300 group-hover:opacity-0">
                  <Instagram className="h-3.5 w-3.5" />
                </span>
              </button>
            </Reveal>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400 sm:hidden">Tap a photo to view — follow @{INSTAGRAM_HANDLE} for more campus moments.</p>
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
