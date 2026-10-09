import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Volume2, VolumeX, Quote } from "lucide-react";
import { useContent } from "../lib/content";

const ReelCard = ({ item, index }) => {
  const videoRef = useRef(null);
  const wrapRef = useRef(null);
  const [soundOn, setSoundOn] = useState(false);
  const [failed, setFailed] = useState(false);
  const inView = useInView(wrapRef, { amount: 0.35 });
  const src = item.video_url || item.video_link || "";

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src || failed) return;
    if (inView) video.play().catch(() => {});
    else video.pause();
  }, [inView, src, failed]);

  if (!src) return null;

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setSoundOn(!video.muted);
  };

  return (
    <div
      ref={wrapRef}
      data-testid={`reel-card-${index}`}
      className="group relative aspect-[9/16] w-[248px] shrink-0 snap-center overflow-hidden rounded-3xl bg-[#22090F] shadow-lg shadow-rose-100/60 sm:w-[272px]"
    >
      {failed ? (
        <div className="absolute inset-0 bg-gradient-to-br from-[#6E0A28] via-[#22090F] to-[#3B0A1E]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:18px_18px]" />
        </div>
      ) : (
        <video
          ref={videoRef}
          data-testid={`reel-video-${index}`}
          src={src}
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#22090F]/90 via-transparent to-[#22090F]/30" />

      {!failed && (
        <button
          type="button"
          data-testid={`reel-sound-${index}`}
          aria-label={soundOn ? "Mute video" : "Unmute video"}
          onClick={toggleSound}
          className="absolute right-3 top-3 rounded-full border border-white/25 bg-white/10 p-2.5 text-white backdrop-blur-md transition-all duration-300 hover:border-teal-300/60 hover:text-teal-200"
        >
          {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5">
        <Quote className="mb-2 h-4 w-4 text-[#F471B5]" />
        <p data-testid={`reel-quote-${index}`} className="line-clamp-4 text-[13px] leading-relaxed text-white/90">
          {item.quote}
        </p>
        <p data-testid={`reel-name-${index}`} className="mt-3 font-display text-lg font-semibold leading-tight text-white">
          {item.name}
        </p>
        {item.programme && (
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-teal-300">{item.programme}</p>
        )}
      </div>
    </div>
  );
};

export default function Reels() {
  const content = useContent();
  const items = (content.testimonials?.items || []).filter((it) => it.video_url || it.video_link);

  if (!items.length) return null;

  return (
    <div data-testid="reels-row" className="mt-12">
      <div className="flex items-center gap-3">
        <span className="h-px w-10 bg-[#BE185D]/40" />
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#BE185D]">
          Student stories — in their own words
        </p>
      </div>
      <div className="-mx-5 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] lg:-mx-2 lg:px-2 [&::-webkit-scrollbar]:hidden">
        {items.map((it, i) => (
          <ReelCard key={it.id || i} item={it} index={i} />
        ))}
      </div>
    </div>
  );
}