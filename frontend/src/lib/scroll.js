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
