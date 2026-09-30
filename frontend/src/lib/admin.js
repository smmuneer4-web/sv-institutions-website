import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { api, formatApiError, clearAuth } from "./api";

export const STATUSES = ["submitted", "shortlist", "approved", "rejected"];
export const COLLEGES = ["S V College of Nursing", "D R Vijayakumari School of Nursing"];

export const STATUS_STYLE = {
  submitted: "bg-slate-100 text-slate-600",
  shortlist: "bg-teal-50 text-[#0F766E]",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-[#9F1239]",
};
export const STATUS_LABEL = { submitted: "Submitted", shortlist: "Shortlisted", approved: "Approved", rejected: "Rejected" };

export const initials = (s) => (s || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
export const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso || "—";
  }
};
export const inr = (n) => "₹ " + Number(n || 0).toLocaleString("en-IN");
export const collected = (a) => (a.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
export const overdueFor = (a) => {
  const pays = a.payments || [];
  const paidBy = (sid) => pays.filter((p) => p.schedule_id === sid).reduce((s, p) => s + Number(p.amount || 0), 0);
  const today = new Date().setHours(0, 0, 0, 0);
  return (a.schedules || [])
    .map((sc) => {
      const outstanding = Number(sc.amount || 0) - paidBy(sc.id);
      const overdueDays = sc.due_date ? Math.floor((today - new Date(sc.due_date).setHours(0, 0, 0, 0)) / 86400000) : -1;
      return { ...sc, outstanding, overdueDays, isOverdue: outstanding > 0 && overdueDays >= 0 };
    })
    .filter((s) => s.isOverdue);
};
export const overdueTotal = (a) => overdueFor(a).reduce((s, r) => s + r.outstanding, 0);
export const waLink = (phone) => {
  const d = (phone || "").split("").filter((c) => /\d/.test(c)).join("");
  return `https://wa.me/${d.length === 10 ? `91${d}` : d}`;
};

export function useAdminAuth() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    api.get("/auth/me")
      .then(({ data }) => setUser(data))
      .catch(() => setUser(false));
  }, []);
  return [user, setUser];
}

export function useApplications(user) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = () => {
    setLoading(true);
    api.get("/applications")
      .then(({ data }) => setApps(data))
      .catch((e) => setError(formatApiError(e)))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    if (user) load();
  }, [user]);
  return { apps, load, loading, error, setError };
}

export function Topbar({ user, active = "", children }) {
  const link = (href, label, key) => (
    <a
      key={key}
      href={href}
      data-testid={`admin-nav-${key}`}
      className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
        active === key ? "bg-[#BE185D] text-white shadow-md shadow-rose-200" : "text-slate-500 hover:text-[#BE185D]"
      }`}
    >
      {label}
    </a>
  );
  return (
    <header className="no-print border-b border-rose-100 bg-white px-5 py-4">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <a href="/admin" data-testid="admin-topbar-home" className="flex items-center gap-3">
          <img src="/sv-logo.png" alt="S V logo" className="h-12 w-12 rounded-full object-cover ring-1 ring-rose-100" />
          <div>
            <p className="font-display text-xl font-semibold leading-tight text-[#22090F]">Admissions Console</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-700">S V Group of Institutions, Bengaluru</p>
          </div>
        </a>
        <div className="flex items-center gap-2">
          {link("/admin", "Overview", "overview")}
          {link("/admin/students", "Students & Fees", "students")}
          {link("/admin/colleges", "Colleges & Courses", "colleges")}
          {link("/admin/content", "Site Content", "content")}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-xs font-bold text-[#0F766E] sm:inline-flex">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#0D9488]" /> Admin session · {user.email}
          </span>
          <a href="/" data-testid="admin-back-to-site-link" className="hidden text-xs font-bold text-slate-500 hover:text-[#BE185D] sm:inline">
            View Website
          </a>
          <button
            data-testid="admin-logout-button"
            onClick={async () => {
              await api.post("/auth/logout").catch(() => {});
              clearAuth();
              window.location.href = "/admin";
            }}
            className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-5 py-2.5 text-xs font-bold text-[#9F1239] transition-colors hover:bg-rose-50"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
