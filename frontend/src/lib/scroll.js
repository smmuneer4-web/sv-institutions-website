import { useEffect } from "react";

export const scrollToId = (id) => {
  const el = document.querySelector(id);
  if (!el) return;
  if (window.__lenis) {
    window.__lenis.scrollTo(el, { offset: -72, duration: 1.3 });
  } else {
    el.scrollIntoView({ behavior: "smooth" });
  }
};

export const prefillEnquiry = (detail) => {
  window.dispatchEvent(new CustomEvent("prefill-enquiry", { detail }));
};

// Pauses the global Lenis smooth-scroll engine while a modal/drawer is open,
// so native scrolling works inside it (wheel events are no longer hijacked).
export function useLenisStop(active) {
  useEffect(() => {
    if (!active) return;
    window.__lenis && window.__lenis.stop();
    return () => window.__lenis && window.__lenis.start();
  }, [active]);
}
