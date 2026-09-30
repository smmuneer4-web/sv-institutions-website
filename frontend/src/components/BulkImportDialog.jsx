import { useMemo, useState } from "react";
import Papa from "papaparse";
import { X, Upload, Download, Loader2, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { api, formatApiError } from "../lib/api";

const REQUIRED_COLS = ["full_name", "mobile", "email", "collegeId", "courseId"];
const TEMPLATE_HEADERS = [
  "full_name", "mobile", "email", "collegeId", "courseId",
  "dob", "gender", "city", "state", "pincode",
  "guardian_name", "guardian_mobile", "b10_pct", "b12_pct",
  "year1", "year2", "year3", "year4", "scholarship_amount",
];

const downloadTemplate = (colleges) => {
  const c1 = colleges[0] || { id: "svcon", courses: [{ id: "bsc-nursing" }] };
  const c2 = colleges[1] || colleges[0] || { id: "drvson", courses: [{ id: "dgnm" }] };
  const rows = [
    {
      full_name: "Ananya Krishnan", mobile: "9876500001", email: "ananya@example.com",
      collegeId: c1.id, courseId: (c1.courses[0] || {}).id || "",
      dob: "2005-04-12", gender: "Female", city: "Bengaluru", state: "Karnataka", pincode: "560056",
      guardian_name: "Krishnan R.", guardian_mobile: "9988770011", b10_pct: "88.5", b12_pct: "82.4",
      year1: "60000", year2: "65000", year3: "", year4: "", scholarship_amount: "",
    },
    {
      full_name: "Rahul Menon", mobile: "9876500002", email: "rahul@example.com",
      collegeId: (colleges[1] || c1).id, courseId: ((colleges[1] || c1).courses[0] || {}).id || "",
      dob: "2004-11-03", gender: "Male", city: "Kochi", state: "Kerala", pincode: "682001",
      guardian_name: "Sunil Menon", guardian_mobile: "9988770022", b10_pct: "81", b12_pct: "77.6",
      year1: "55000", year2: "58000", year3: "", year4: "", scholarship_amount: "10000",
    },
  ];
  const csv = TEMPLATE_HEADERS.map((h) => [h, ...rows.map((r) => String(r[h] ?? "")).map((v) => (v.includes(",") ? `"${v}"` : v))].join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sv-students-template.csv";
  a.click();
  URL.revokeObjectURL(url);
};

export default function BulkImportDialog({ open, onClose, colleges, onImported }) {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const collegeIndex = useMemo(() => {
    const idx = {};
    (colleges || []).forEach((c) => {
      idx[c.id] = c;
    });
    return idx;
  }, [colleges]);

  const reset = () => {
    setFile(null);
    setRows([]);
    setErrors([]);
    setResult(null);
    setError("");
  };

  const validate = (parsed) => {
    const errs = [];
    parsed.forEach((r, i) => {
      const rowNum = i + 1;
      REQUIRED_COLS.forEach((k) => {
        if (!String(r[k] || "").trim()) errs.push({ row: rowNum, msg: `Missing ${k}` });
      });
      const email = String(r.email || "").trim();
      if (email && !email.includes("@")) errs.push({ row: rowNum, msg: "Email looks invalid" });
      const mob = String(r.mobile || "").replace(/\D/g, "");
      if (mob && (mob.length < 10 || mob.length > 12)) errs.push({ row: rowNum, msg: "Mobile should be 10 digits" });
      const col = collegeIndex[String(r.collegeId || "").trim()];
      if (r.collegeId && !col) errs.push({ row: rowNum, msg: `Unknown collegeId "${r.collegeId}"` });
      if (col && r.courseId) {
        const found = (col.courses || []).some((c) => c.id === String(r.courseId).trim());
        if (!found) errs.push({ row: rowNum, msg: `Unknown courseId "${r.courseId}" for ${col.name}` });
      }
    });
    return errs;
  };

  const handleFile = (f) => {
    setFile(f);
    setRows([]);
    setErrors([]);
    setResult(null);
    setError("");
    if (!f) return;
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (r) => {
        const parsed = (r.data || []).filter((row) => Object.values(row).some((v) => String(v || "").trim() !== ""));
        if (!parsed.length) {
          setError("The CSV appears to be empty.");
          return;
        }
        setRows(parsed);
        setErrors(validate(parsed));
      },
      error: (err) => setError("CSV parse failed: " + err.message),
    });
  };

  const runImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    setError("");
    try {
      const { data } = await api.post("/admin/students/bulk-import", { students: rows });
      setResult(data);
      onImported && onImported();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#22090F]/70 p-4 backdrop-blur-sm sm:p-8" onClick={() => { onClose(); reset(); }}>
      <div
        data-testid="bulk-import-dialog"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4 bg-[#6E0A28] px-6 py-4 text-white">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/70">Bulk import</p>
            <p className="font-display text-xl font-semibold">Enroll multiple students from CSV</p>
          </div>
          <button onClick={() => { onClose(); reset(); }} aria-label="Close" data-testid="bulk-import-close-button" className="rounded-full border border-white/25 p-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5" data-lenis-prevent>
          <div className="rounded-2xl border border-rose-100 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-bold text-[#22090F]">1. Download CSV template</p>
                <p className="mt-0.5 text-[11.5px] text-slate-400">Includes sample rows and all supported columns.</p>
              </div>
              <button data-testid="bulk-template-download" onClick={() => downloadTemplate(colleges)} className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-[#BE185D] hover:text-[#BE185D]">
                <Download className="h-3.5 w-3.5" /> Download template
              </button>
            </div>
            <p className="mt-3 text-[11.5px] text-slate-500">
              Required columns: <span className="font-mono font-semibold text-[#BE185D]">full_name, mobile, email, collegeId, courseId</span>. Use the college / course IDs shown on the Colleges page.
            </p>
          </div>

          <div className="rounded-2xl border border-rose-100 p-4">
            <p className="mb-2 text-[13px] font-bold text-[#22090F]">2. Choose a CSV file</p>
            <label className="block cursor-pointer rounded-xl border-2 border-dashed border-rose-200 p-6 text-center transition-colors hover:border-[#BE185D]/50 hover:bg-rose-50/30">
              <Upload className="mx-auto mb-2 h-6 w-6 text-[#BE185D]" />
              <span className="text-[12.5px] font-semibold text-[#22090F]">{file ? file.name : "Click to select a CSV file"}</span>
              <span className="mt-0.5 block text-[11px] text-slate-400">Only .csv files</span>
              <input data-testid="bulk-file-input" type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
            </label>
          </div>

          {rows.length > 0 && !result && (
            <div className="overflow-hidden rounded-2xl border border-rose-100">
              <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50/40 px-4 py-2.5">
                <p className="flex items-center gap-2 text-[12.5px] font-bold text-[#22090F]">
                  <FileText className="h-4 w-4 text-[#BE185D]" /> Preview ({rows.length} row{rows.length > 1 ? "s" : ""})
                </p>
                {errors.length > 0 ? (
                  <p className="text-[11px] font-bold text-[#9F1239]">{errors.length} validation issue(s)</p>
                ) : (
                  <p className="text-[11px] font-bold text-emerald-700">All rows look valid</p>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Mobile</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">College · Course</th>
                      <th className="px-3 py-2">Fees</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 25).map((r, i) => {
                      const rowErrors = errors.filter((e) => e.row === i + 1);
                      const col = collegeIndex[String(r.collegeId || "").trim()];
                      const years = ["year1", "year2", "year3", "year4"].map((k) => r[k]).filter((v) => v && String(v).trim());
                      return (
                        <tr key={i} className={`border-t border-rose-50 ${rowErrors.length ? "bg-rose-50/40" : ""}`}>
                          <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                          <td className="px-3 py-2 font-semibold text-[#22090F]">{r.full_name || "—"}</td>
                          <td className="px-3 py-2 text-slate-600">{r.mobile || "—"}</td>
                          <td className="px-3 py-2 text-slate-600">{r.email || "—"}</td>
                          <td className="px-3 py-2 text-slate-600">
                            {col?.name || <span className="text-[#9F1239]">{r.collegeId || "—"}</span>}
                            <span className="block font-mono text-[10px] text-slate-400">{r.courseId || "—"}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-600">{years.length ? `₹ ${years.join(" + ")}` : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {rows.length > 25 && <p className="border-t border-rose-50 bg-rose-50/30 px-3 py-2 text-center text-[11px] text-slate-400">…and {rows.length - 25} more row(s).</p>}
              </div>
              {errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto border-t border-rose-100 bg-rose-50 px-4 py-3">
                  <p className="mb-1 flex items-center gap-1.5 text-[11.5px] font-bold text-[#9F1239]">
                    <AlertCircle className="h-3.5 w-3.5" /> Issues detected
                  </p>
                  <ul className="list-disc pl-5 text-[11.5px] text-[#9F1239]">
                    {errors.slice(0, 15).map((e, i) => <li key={i}>Row {e.row}: {e.msg}</li>)}
                    {errors.length > 15 && <li>…and {errors.length - 15} more</li>}
                  </ul>
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="overflow-hidden rounded-2xl border border-rose-100">
              <div data-testid="bulk-import-summary" className="border-b border-rose-100 bg-teal-50/50 px-4 py-3">
                <p className="flex items-center gap-2 text-[13px] font-bold text-[#22090F]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Import summary
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  <span className="font-bold text-emerald-700">{result.created} created</span> · <span className="font-bold text-[#9F1239]">{result.failed} failed</span> · {result.total} total
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Result</th>
                      <th className="px-3 py-2">Name / Application ID</th>
                      <th className="px-3 py-2">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map((r) => (
                      <tr key={r.row} className={`border-t border-rose-50 ${r.ok ? "" : "bg-rose-50/40"}`}>
                        <td className="px-3 py-2 text-slate-400">{r.row}</td>
                        <td className="px-3 py-2">
                          {r.ok ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Created</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-[#9F1239]"><AlertCircle className="h-3 w-3" /> Failed</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {r.ok ? (
                            <>
                              <p className="font-semibold text-[#22090F]">{r.full_name}</p>
                              <p className="font-mono text-[10px] font-bold text-[#BE185D]">{r.application_number}</p>
                            </>
                          ) : (
                            r.input?.full_name || "—"
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-500">{r.ok ? "—" : (r.errors || []).join("; ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && <p data-testid="bulk-import-error" className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-[#9F1239]">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-rose-100 bg-[#F8F5F2] px-6 py-4">
          <p className="text-[11.5px] text-slate-400">{rows.length > 0 && !result ? `Ready to import ${rows.length} row(s)` : ""}</p>
          <div className="flex gap-2">
            {result ? (
              <>
                <button onClick={reset} className="rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600">Import another</button>
                <button onClick={() => { onClose(); reset(); }} className="rounded-full bg-[#BE185D] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#9F1239]">Done</button>
              </>
            ) : (
              <>
                <button onClick={() => { onClose(); reset(); }} className="rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600">Cancel</button>
                <button data-testid="bulk-import-run-button" disabled={!rows.length || importing} onClick={runImport} className="inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-200 transition-colors hover:bg-[#9F1239] disabled:opacity-50">
                  {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {importing ? "Importing…" : `Import ${rows.length ? `${rows.length} row(s)` : ""}`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
