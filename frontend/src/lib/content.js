import { useEffect, useState } from "react";
import { api } from "./api";

export const DEFAULT_CONTENT = {
  contact: {
    name: "S V GROUP OF INSTITUTIONS",
    tagline: "Excellence in Health Education · Bengaluru",
    email: "admissions@svinstitutions.co.in",
    phone: "+91 90378 34632",
    address: "80 Feet Ring Road, Near Bangalore University, Mallathahalli Bus Stop, Bangalore - 560056",
    instagram: "svgoiofficial",
  },
  hero: {
    headline_lines: ["A Culture of", "Excellence", "in Learning"],
    sub: "S V College of Nursing is renowned across India for its excellence in nursing education — affiliated to Rajiv Gandhi University of Health Sciences and recognised by the Indian Nursing Council & Karnataka State Nursing Council.",
    video_media_id: null,
    poster_media_id: null,
    poster_fallback: "https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?q=80&w=1600&auto=format&fit=crop",
    video_fallback: "/hero.mp4",
    video_kind: "upload",
    video_link: "",
    video_url: "/hero.mp4",
    poster_url: "https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?q=80&w=1600&auto=format&fit=crop",
    stats: [
      { n: "135", l: "Sanctioned Seats" },
      { n: "03", l: "Nursing Programs" },
      { n: "02", l: "Institutions" },
    ],
  },
  gallery: {
    photos: [
      { id: "g1", url: "https://images.pexels.com/photos/35645510/pexels-photo-35645510.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2", caption: "Skill lab — supervised phlebotomy practice", tag: "Labs" },
      { id: "g2", url: "https://images.unsplash.com/photo-1517120026326-d87759a7b63b?q=80&w=1200&auto=format&fit=crop", caption: "Hospital postings — neonatal intensive care", tag: "Hospital Training" },
      { id: "g3", "url": "https://images.unsplash.com/photo-1709805619372-40de3f158e83?q=80&w=1200&auto=format&fit=crop", caption: "Campus hostel accommodation", tag: "Hostels" },
      { id: "g4", url: "https://images.pexels.com/photos/35645506/pexels-photo-35645506.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2", caption: "Clinical procedures under faculty supervision", tag: "Labs" },
      { id: "g5", url: "https://images.unsplash.com/photo-1762512346988-045f4d5ad2b3?q=80&w=1200&auto=format&fit=crop", caption: "Digital health library & study hall", tag: "Library" },
      { id: "g6", url: "https://images.unsplash.com/photo-1586534738560-438efdf1d205?q=80&w=1200&auto=format&fit=crop", caption: "Ward rounds and hands-on hospital exposure", tag: "Hospital Training" },
    ],
  },
  facilities: {
    hostel_url: "https://images.unsplash.com/photo-1769147555720-71fc71bfc216?q=80&w=1600&auto=format&fit=crop",
    hostel_media_id: null,
  },
  faq: {
    items: [
      { q: "Which nursing courses does S V College of Nursing offer?", a: "We offer three programs — B.Sc Nursing (4 years), M.Sc Nursing (2 years) and GNM — General Nursing & Midwifery (3 years) — with a combined intake of 135 sanctioned seats, all under S V Group of Institutions, Bengaluru." },
      { q: "Is the college recognised and affiliated?", a: "Yes. S V College of Nursing is affiliated to Rajiv Gandhi University of Health Sciences (RGUHS), Bengaluru, and recognised by the Indian Nursing Council (INC) and Karnataka State Nursing Council (KSNC). Official approval documents are displayed on this website." },
      { q: "How can I apply for admission?", a: "Apply online using the Apply Now form on this website — it takes about 10 minutes and saves your progress automatically. You can also call +91 90378 34632 or visit the campus at Mallathahalli, Bengaluru." },
      { q: "Does the college provide hostel facilities?", a: "Yes — separate, secure hostels for female and male students with 24/7 security, resident wardens, mess and study halls on campus." },
      { q: "Where exactly is the campus located?", a: "80 Feet Ring Road, beside Bangalore University, at Mallathahalli Bus Stop, Bengaluru – 560056. The campus is well connected by BMTC buses to all parts of the city." },
      { q: "What is the eligibility for B.Sc Nursing?", a: "Candidates should have passed 10+2 (PUC or equivalent) with Physics, Chemistry, Biology and English, and be 17 years of age or older. Our admissions team will walk you through the exact RGUHS criteria and documents needed." },
    ],
  },
};

let cache = null;
let inFlight = null;
const subscribers = new Set();
const notify = () => subscribers.forEach((cb) => cb(cache));

const fetchOnce = () => {
  if (inFlight) return inFlight;
  inFlight = api
    .get("/content")
    .then(({ data }) => {
      cache = data;
      notify();
      return cache;
    })
    .catch(() => null)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
};

export const refetchContent = async () => {
  inFlight = null;
  await fetchOnce();
};

export const useContent = () => {
  const [content, setContent] = useState(cache || DEFAULT_CONTENT);

  useEffect(() => {
    const cb = (data) => {
      if (data) setContent(data);
    };
    subscribers.add(cb);
    if (!cache) fetchOnce();
    return () => subscribers.delete(cb);
  }, []);

  return content;
};

export const useContentStrict = () => {
  const [content, setContent] = useState(cache);

  useEffect(() => {
    const cb = (data) => {
      if (data) setContent(data);
    };
    subscribers.add(cb);
    if (!cache) fetchOnce();
    return () => subscribers.delete(cb);
  }, []);

  return content; // null until the real content arrives (admin pages: always show server truth)
};

export const uploadMedia = async (file) => {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const { data } = await api.post("/admin/media", { name: file.name, mime: file.type, data: dataUrl });
  return data;
};

export const uploadMediaRaw = async (file) => {
  const { data } = await api.post(
    `/admin/media/raw?name=${encodeURIComponent(file.name)}&mime=${encodeURIComponent(file.type || "video/mp4")}`,
    file,
    { headers: { "Content-Type": "application/octet-stream" }, timeout: 300000 }
  );
  return data;
};
