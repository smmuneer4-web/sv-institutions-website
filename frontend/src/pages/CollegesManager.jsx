import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, X, Check, RefreshCw, Building2, GraduationCap } from "lucide-react";
import { useAdminAuth, Topbar } from "../lib/admin";
import { listCollegesAdmin, createCollege, updateCollege, deleteCollege, addCourse, updateCourse, deleteCourse, refetchColleges } from "../lib/colleges";
import { formatApiError } from "../lib/api";

const CourseRow = ({ college, course, onChanged }) => {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ name: course.name, duration: course.duration, seats: String(course.seats || ""), eligibility: course.eligibility });
  const [busy, setBusy] = useState(false);

  const run = (fn) => {
    setBusy(true);
    fn()
      .then((collegeDoc) => onChanged(collegeDoc, true))
      .catch((e) => window.alert(formatApiError(e)))
      .finally(() => setBusy(false));
  };

  if (edit) {
    return (
      <tr data-testid={`college-course-edit-row-${course.id}`} className="border-b border-rose-50">
        <td colSpan={5} className="py-3">
          <div className="grid gap-2 rounded-2xl bg-rose-50/50 p-3 sm:grid-cols-5">
            <input data-testid={`college-course-name-input-${course.id}`} className="form-input text-sm" placeholder="Course name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <input className="form-input text-sm" placeholder="Duration" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} />
            <input className="form-input text-sm" inputMode="numeric" placeholder="Seats" value={form.seats} onChange={(e) => setForm((f) => ({ ...f, seats: e.target.value.replace(/[^0-9]/g, "") }))} />
            <input className="form-input text-sm" placeholder="Eligibility" value={form.eligibility} onChange={(e) => setForm((f) => ({ ...f, eligibility: e.target.value }))} />
            <div className="flex gap-2">
              <button data-testid={`college-course-save-${course.id}`} disabled={busy} onClick={() => run(() => updateCourse(college.id, course.id, { name: form.name, duration: form.duration, seats: Number(form.seats || 0), eligibility: form.eligibility })).then(() => setEdit(false))} className="inline-flex items-center gap-1.5 rounded-full bg-[#BE185D] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"><Check className="h-3.5 w-3.5" /> Save</button>
              <button onClick={() => setEdit(false)} className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-slate-500"><X className="h-3.5 w-3.5" /> Cancel</button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr data-testid={`college-course-row-${course.id}`} className="border-b border-rose-50 last:border-0">
      <td className="py-3 pr-4 font-semibold text-[#22090F]">{course.name}</td>
      <td className="px-4 py-3 text-slate-600">{course.duration || "—"}</td>
      <td className="px-4 py-3 text-slate-600">{course.seats || "—"}</td>
      <td className="px-4 py-3 text-slate-500">{course.eligibility || "—"}</td>
      <td className="px-4 py-3 text-right">
        <button data-testid={`college-course-active-${course.id}`} onClick={() => run(() => updateCourse(college.id, course.id, { active: !course.active }))} className={`mr-1.5 rounded-full px-3 py-1 text-[10px] font-bold ${course.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          {course.active ? "Active" : "Hidden"}
        </button>
        <button data-testid={`college-course-edit-${course.id}`} aria-label="Edit course" onClick={() => setEdit(true)} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-[#BE185D]"><Pencil className="h-4 w-4" /></button>
        <button data-testid={`college-course-delete-${course.id}`} aria-label="Delete course" onClick={() => window.confirm(`Remove course "${course.name}"?`) && run(() => deleteCourse(college.id, course.id))} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-[#9F1239]"><Trash2 className="h-4 w-4" /></button>
      </td>
    </tr>
  );
};

const CollegeCard = ({ college, onChanged }) => {
  const [addOpen, setAddOpen] = useState(false);
  const [editMeta, setEditMeta] = useState(false);
  const [meta, setMeta] = useState({ name: college.name, campus: college.campus || "" });
  const [newCourse, setNewCourse] = useState({ name: "", duration: "", seats: "", eligibility: "" });
  const [busy, setBusy] = useState(false);

  const run = (fn) => {
    setBusy(true);
    fn()
      .then((doc) => onChanged(doc, true))
      .catch((e) => window.alert(formatApiError(e)))
      .finally(() => setBusy(false));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-rose-100 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-[#BE185D]"><Building2 className="h-5 w-5" /></span>
          <div>
            {editMeta ? (
              <div className="flex flex-wrap gap-2">
                <input data-testid={`college-name-input-${college.id}`} className="form-input text-sm" value={meta.name} onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))} />
                <input className="form-input text-sm" placeholder="Campus" value={meta.campus} onChange={(e) => setMeta((m) => ({ ...m, campus: e.target.value }))} />
                <button data-testid={`college-save-${college.id}`} disabled={busy} onClick={() => run(() => updateCollege(college.id, meta)).then(() => setEditMeta(false))} className="inline-flex items-center gap-1.5 rounded-full bg-[#BE185D] px-4 py-2 text-xs font-bold text-white"><Check className="h-3.5 w-3.5" /> Save</button>
                <button onClick={() => setEditMeta(false)} className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-slate-500"><X className="h-3.5 w-3.5" /></button>
              </div>
            ) : (
              <>
                <p className="font-display text-xl font-semibold text-[#22090F]">{college.name}</p>
                <p className="text-xs text-slate-400">{college.campus || "—"} · ID <span className="font-mono font-semibold text-[#9F1239]">{college.id}</span></p>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid={`college-active-${college.id}`} onClick={() => run(() => updateCollege(college.id, { active: !college.active }))} className={`rounded-full px-3 py-1 text-[10px] font-bold ${college.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            {college.active ? "Active" : "Hidden"}
          </button>
          <button data-testid={`college-edit-${college.id}`} aria-label="Edit college" onClick={() => { setEditMeta(!editMeta); setMeta({ name: college.name, campus: college.campus || "" }); }} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-[#BE185D]"><Pencil className="h-4 w-4" /></button>
          <button data-testid={`college-delete-${college.id}`} aria-label="Delete college" onClick={() => window.confirm(`Delete college "${college.name}" and all its courses?`) && run(() => deleteCollege(college.id))} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-[#9F1239]"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-rose-100 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              <th className="py-2.5 pr-4">Course</th>
              <th className="px-4 py-2.5">Duration</th>
              <th className="px-4 py-2.5">Seats</th>
              <th className="px-4 py-2.5">Eligibility</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(college.courses || []).map((course) => (
              <CourseRow key={course.id} college={college} course={course} onChanged={onChanged} />
            ))}
            {(college.courses || []).length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-xs text-slate-400">No courses yet — add the first one below.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <div className="mt-4 grid gap-2 rounded-2xl bg-rose-50/50 p-3 sm:grid-cols-5">
          <input data-testid={`college-add-course-name-${college.id}`} className="form-input text-sm" placeholder="Course name" value={newCourse.name} onChange={(e) => setNewCourse((f) => ({ ...f, name: e.target.value }))} />
          <input className="form-input text-sm" placeholder="Duration" value={newCourse.duration} onChange={(e) => setNewCourse((f) => ({ ...f, duration: e.target.value }))} />
          <input className="form-input text-sm" inputMode="numeric" placeholder="Seats" value={newCourse.seats} onChange={(e) => setNewCourse((f) => ({ ...f, seats: e.target.value.replace(/[^0-9]/g, "") }))} />
          <input className="form-input text-sm" placeholder="Eligibility" value={newCourse.eligibility} onChange={(e) => setNewCourse((f) => ({ ...f, eligibility: e.target.value }))} />
          <div className="flex gap-2">
            <button data-testid={`college-add-course-save-${college.id}`} disabled={busy || !newCourse.name.trim()} onClick={() => run(() => addCourse(college.id, { name: newCourse.name, duration: newCourse.duration, seats: Number(newCourse.seats || 0), eligibility: newCourse.eligibility })).then(() => { setAddOpen(false); setNewCourse({ name: "", duration: "", seats: "", eligibility: "" }); })} className="inline-flex items-center gap-1.5 rounded-full bg-[#BE185D] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"><Plus className="h-3.5 w-3.5" /> Add</button>
            <button onClick={() => setAddOpen(false)} className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
          </div>
        </div>
      )}
      {!addOpen && (
        <button data-testid={`college-add-course-${college.id}`} onClick={() => setAddOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-[#BE185D] hover:text-[#BE185D]">
          <GraduationCap className="h-3.5 w-3.5" /> Add Course
        </button>
      )}
    </motion.div>
  );
};

export default function CollegesManager() {
  const [user] = useAdminAuth();
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newCollege, setNewCollege] = useState({ name: "", campus: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    listCollegesAdmin()
      .then(setColleges)
      .catch((e) => setError(formatApiError(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  if (user === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F5F2]">
        <p className="animate-pulse font-display text-2xl text-[#9F1239]">Loading console…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/admin" replace />;

  const onChanged = (doc, refresh) => {
    if (refresh) refetchColleges();
    load();
    return doc;
  };

  const submitCollege = () => {
    setBusy(true);
    setError("");
    createCollege({ name: newCollege.name, campus: newCollege.campus })
      .then(() => {
        setAddOpen(false);
        setNewCollege({ name: "", campus: "" });
        onChanged(null, true);
        load();
      })
      .catch((e) => setError(formatApiError(e)))
      .finally(() => setBusy(false));
  };

  return (
    <div className="min-h-screen bg-[#F8F5F2]">
      <Topbar user={user} active="colleges" />
      <main className="mx-auto max-w-7xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-semibold text-[#22090F]">Colleges &amp; Courses</h1>
            <p className="mt-1.5 text-sm text-slate-500">Manage the institutions and programmes shown on the application form and website dropdowns.</p>
          </div>
          <div className="flex items-center gap-2">
            <button data-testid="colleges-refresh-button" onClick={load} className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:border-[#BE185D] hover:text-[#BE185D]">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button data-testid="colleges-add-college-button" onClick={() => setAddOpen(!addOpen)} className="inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-200 transition-colors hover:bg-[#9F1239]">
              <Plus className="h-3.5 w-3.5" /> Add College
            </button>
          </div>
        </div>

        {addOpen && (
          <div className="mt-6 grid gap-3 rounded-3xl border border-rose-100 bg-white p-6 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">College Name *</label>
              <input data-testid="colleges-new-name-input" className="form-input" placeholder="e.g. S V College of Nursing" value={newCollege.name} onChange={(e) => setNewCollege((c) => ({ ...c, name: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Campus</label>
              <input data-testid="colleges-new-campus-input" className="form-input" placeholder="e.g. Mallathahalli, Bengaluru" value={newCollege.campus} onChange={(e) => setNewCollege((c) => ({ ...c, campus: e.target.value }))} />
            </div>
            <div className="flex items-end gap-2">
              <button data-testid="colleges-new-save-button" disabled={busy || !newCollege.name.trim()} onClick={submitCollege} className="inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60"><Check className="h-3.5 w-3.5" /> Add College</button>
              <button onClick={() => setAddOpen(false)} className="rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-500">Cancel</button>
            </div>
          </div>
        )}

        {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-[#9F1239]">{error}</p>}

        <div className="mt-6 space-y-5">
          {colleges.map((college) => (
            <CollegeCard key={college.id} college={college} onChanged={onChanged} />
          ))}
          {!loading && colleges.length === 0 && (
            <div className="rounded-3xl border border-rose-100 bg-white p-16 text-center text-sm text-slate-400">
              No colleges yet. Click "Add College" to create the first one.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
