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
