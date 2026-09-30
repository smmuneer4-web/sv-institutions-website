import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { RefreshCw, ChevronRight, Search, AlertTriangle, Upload } from "lucide-react";
import { useAdminAuth, useApplications, Topbar, COLLEGES, STATUS_STYLE, STATUS_LABEL, initials, inr, collected, overdueFor, overdueTotal } from "../lib/admin";
import BulkImportDialog from "../components/BulkImportDialog";
import { useColleges } from "../lib/colleges";

const TRACKED = ["shortlist", "approved"];

export default function StudentsPage() {
  const [user] = useAdminAuth();
  const { apps, load, error } = useApplications(user);
  const [collegeFilter, setCollegeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const { colleges } = useColleges();

  if (user === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F5F2]">
        <p className="animate-pulse font-display text-2xl text-[#9F1239]">Loading console…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/admin" replace />;

  const tracked = apps
    .filter((a) => TRACKED.includes(a.status))
    .filter((a) => collegeFilter === "all" || a.college === collegeFilter)
    .filter((a) =>
      [a.full_name, a.mobile, a.application_number, a.programme].join(" ").toLowerCase().includes(search.toLowerCase())
    );
  const overdueStudents = tracked.filter((a) => overdueFor(a).length > 0);
  const overdueSum = overdueStudents.reduce((s, a) => s + overdueTotal(a), 0);

  const planned = apps.reduce((s, a) => s + Number(a.fee_total || 0), 0);
  const paid = apps.reduce((s, a) => s + collected(a), 0);

  const stat = (label, value, sub, testid) => (
    <div data-testid={testid} className="rounded-2xl border border-rose-100 bg-white p-6">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-3 font-display text-4xl font-semibold leading-none text-[#22090F]">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{sub}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F5F2]">
      <Topbar user={user} active="students" />
      <main className="mx-auto max-w-7xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-semibold text-[#22090F]">Students &amp; Fee Collection</h1>
            <p className="mt-1.5 text-sm text-slate-500">Manage enrolled students, fee plans and payment collections.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="students-bulk-import-button"
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:border-[#BE185D] hover:text-[#BE185D]"
            >
              <Upload className="h-3.5 w-3.5" /> Bulk Import
            </button>
            <button
              data-testid="students-refresh-button"
              onClick={load}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:border-[#BE185D] hover:text-[#BE185D]"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        </div>

        <BulkImportDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          colleges={colleges}
          onImported={load}
        />

        <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stat("Total Students", tracked.length, "Currently tracked", "students-stat-total")}
          {stat("Planned Fees", inr(planned), "Across all students", "students-stat-planned")}
          {stat("Collected", inr(paid), "Actual receipts", "students-stat-collected")}
          {stat("Outstanding", inr(planned - paid), "Yet to collect", "students-stat-outstanding")}
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <select data-testid="students-college-filter" value={collegeFilter} onChange={(e) => setCollegeFilter(e.target.value)} className="form-input w-auto pr-8 text-sm font-semibold sm:w-72">
            <option value="all">All colleges</option>
            {COLLEGES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="relative sm:w-80">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              data-testid="students-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate, mobile, application no..."
              className="form-input pl-11"
            />
          </div>
        </div>

        {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-[#9F1239]">{error}</p>}

        {overdueStudents.length > 0 && (
          <div data-testid="students-overdue-banner" className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#BE185D]" />
              <div>
                <p className="text-sm font-bold text-[#9F1239]">{overdueStudents.length} student{overdueStudents.length > 1 ? "s" : ""} with overdue fee installments</p>
                <p className="text-xs text-slate-500">{inr(overdueSum)} outstanding on overdue schedules</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 overflow-hidden rounded-3xl border border-rose-100 bg-white">
          <div className="flex items-center justify-between border-b border-rose-100 px-6 py-4">
            <p className="text-sm font-bold text-[#22090F]">Students</p>
            <p data-testid="students-table-count" className="text-xs font-semibold text-slate-400">{tracked.length} record(s)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-rose-100 bg-rose-50/40 text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
                  <th className="px-6 py-4">Application ID</th>
                  <th className="px-6 py-4">Candidate</th>
                  <th className="px-6 py-4">Programme</th>
                  <th className="px-6 py-4">Plan</th>
                  <th className="px-6 py-4">Collected</th>
                  <th className="px-6 py-4">Balance</th>
                  <th className="px-6 py-4">Overdue</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody>
                {tracked.map((a) => {
                  const od = overdueFor(a);
                  return (
                  <tr
                    key={a.id}
                    data-testid={`students-row-${a.application_number}`}
                    className="cursor-pointer border-b border-rose-50 transition-colors last:border-0 hover:bg-rose-50/40"
                  >
                    <td className="px-6 py-4">
                      <Link to={`/admin/students/${a.application_number}`} data-testid={`students-row-link-${a.application_number}`} className="font-mono text-xs font-semibold text-[#9F1239] hover:underline">
                        {a.application_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {a.photo ? (
                          <img src={a.photo} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-xs font-bold text-[#BE185D]">
                            {initials(a.full_name)}
                          </span>
                        )}
                        <span className="font-semibold text-[#22090F]">{a.full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {a.programme}
                      <span className="block text-xs text-slate-400">{a.college}</span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{inr(a.fee_total)}</td>
                    <td className="px-6 py-4 font-semibold text-emerald-700">{inr(collected(a))}</td>
                    <td className={`px-6 py-4 font-semibold ${a.fee_total - collected(a) > 0 ? "text-[#9F1239]" : "text-slate-400"}`}>
                      {inr(a.fee_total - collected(a))}
                    </td>
                    <td className="px-6 py-4" data-testid={`students-row-overdue-${a.application_number}`}>
                      {od.length ? (
                        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-[#9F1239]">{od.length} overdue · {inr(overdueTotal(a))}</span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLE[a.status]}`}>
                        {STATUS_LABEL[a.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight className="ml-auto h-4 w-4 text-slate-300" />
                    </td>
                  </tr>
                  );
                })}
                {tracked.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center text-sm text-slate-400">
                      No students yet.
                      <span className="block">Set an application's status to "Shortlisted" or "Approved" to start tracking fees.</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
