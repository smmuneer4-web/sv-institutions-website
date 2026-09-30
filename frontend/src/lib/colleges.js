import { useEffect, useState, useCallback } from "react";
import { api } from "./api";

export const FALLBACK_COLLEGES = [
  {
    id: "svcon",
    name: "S V College of Nursing",
    campus: "Mallathahalli, Bengaluru",
    active: true,
    courses: [
      { id: "bsc-nursing", name: "B.Sc. Nursing", duration: "4 Years", seats: 60, eligibility: "PUC (Science) / 10+2", active: true },
      { id: "msc-nursing", name: "M.Sc. Nursing", duration: "2 Years", seats: 25, eligibility: "B.Sc Nursing graduates", active: true },
      { id: "gnm-dgnm", name: "GNM (DGNM)", duration: "2 Years", seats: 50, eligibility: "10+2 / PUC", active: true },
    ],
  },
  {
    id: "drvson",
    name: "D R Vijayakumari School of Nursing",
    campus: "Mallathahalli, Bengaluru",
    active: true,
    courses: [
      { id: "dgnm", name: "DGNM (GNM)", duration: "2 Years", seats: 40, eligibility: "10+2 / PUC", active: true },
    ],
  },
];

let cache = null;
let inFlight = null;
const subscribers = new Set();
const notify = () => subscribers.forEach((cb) => cb(cache));

const fetchOnce = () => {
  if (inFlight) return inFlight;
  inFlight = api
    .get("/colleges")
    .then(({ data }) => {
      cache = Array.isArray(data) && data.length ? data : FALLBACK_COLLEGES;
      notify();
      return cache;
    })
    .catch(() => null)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
};

export const refetchColleges = () => {
  inFlight = null;
  return fetchOnce();
};

export const useColleges = () => {
  const [colleges, setColleges] = useState(cache || FALLBACK_COLLEGES);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    const cb = (data) => {
      if (data && Array.isArray(data)) {
        setColleges(data);
        setLoading(false);
      }
    };
    subscribers.add(cb);
    if (!cache) fetchOnce().finally(() => setLoading(false));
    else setLoading(false);
    return () => subscribers.delete(cb);
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    await refetchColleges();
    setLoading(false);
  }, []);

  return { colleges, loading, refetch };
};

export const listCollegesAdmin = () => api.get("/admin/colleges").then((r) => r.data);
export const createCollege = (body) => api.post("/admin/colleges", body).then((r) => r.data);
export const updateCollege = (id, body) => api.patch(`/admin/colleges/${id}`, body).then((r) => r.data);
export const deleteCollege = (id) => api.delete(`/admin/colleges/${id}`).then((r) => r.data);
export const addCourse = (collegeId, body) => api.post(`/admin/colleges/${collegeId}/courses`, body).then((r) => r.data);
export const updateCourse = (collegeId, courseId, body) => api.patch(`/admin/colleges/${collegeId}/courses/${courseId}`, body).then((r) => r.data);
export const deleteCourse = (collegeId, courseId) => api.delete(`/admin/colleges/${collegeId}/courses/${courseId}`).then((r) => r.data);
