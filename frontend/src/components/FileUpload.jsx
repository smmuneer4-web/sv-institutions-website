import { useRef, useState } from "react";
import { Upload, X, FileText, Loader2 } from "lucide-react";

const compressImage = (file, { maxDim = 1400, quality = 0.78 } = {}) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function FileUpload({ label, value, onChange, hint = "JPG or PNG, up to 5 MB. Compressed automatically.", testid }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleFile = async (file) => {
    setErr("");
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErr("File exceeds 5 MB — please choose a smaller image.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setErr("Only image files (JPG/PNG) are supported.");
      return;
    }
    setLoading(true);
    try {
      onChange(await compressImage(file));
    } catch {
      setErr("Could not read the image. Please try another file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid={testid}>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{label}</label>
      <div className="flex items-start gap-4">
        {value ? (
          <div className="relative">
            <div className="h-28 w-full overflow-hidden rounded-xl border-2 border-rose-100 bg-[#FFFDFB]">
              <img src={value} alt={label} className="h-full w-full object-cover" />
            </div>
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Remove file"
              className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-[#BE185D] text-white shadow-md transition-colors hover:bg-[#9F1239]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="grid h-28 w-full place-items-center rounded-xl border-2 border-dashed border-rose-200 bg-[#FFFDFB] transition-colors hover:border-[#BE185D]/60"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-[#BE185D]" />
            ) : (
              <div className="px-3 text-center">
                <FileText className="mx-auto mb-1 h-5 w-5 text-slate-400" />
                <span className="text-[11.5px] font-medium text-slate-500">Click to upload</span>
              </div>
            )}
          </button>
        )}
        <div className="flex-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#BE185D] transition-colors hover:text-[#9F1239]"
          >
            <Upload className="h-3.5 w-3.5" /> {value ? "Replace" : "Choose file"}
          </button>
          <p className="mt-1 max-w-xs text-[11px] text-slate-400">{hint}</p>
          {err && <p className="mt-1 text-[11px] font-semibold text-[#9F1239]">{err}</p>}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>
    </div>
  );
}
