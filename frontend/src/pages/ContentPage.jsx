import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAdminAuth, Topbar } from "../lib/admin";
import { useContentStrict, refetchContent, uploadMedia, uploadMediaRaw } from "../lib/content";
import FileUpload from "../components/FileUpload";
import { api, formatApiError } from "../lib/api";
import {
  Save, Trash2, Plus, Video, Image as ImageIcon, Type, Loader2, HelpCircle, Clapperboard,
} from "lucide-react";

const TABS = [
  { id: "details", label: "Details", icon: Type },
  { id: "hero", label: "Hero Video & Photo", icon: Video },
  { id: "gallery", label: "Gallery Photos", icon: ImageIcon },
  { id: "facilities", label: "Facilities Photo", icon: ImageIcon },
  { id: "faq", label: "FAQ", icon: HelpCircle },
  { id: "testimonials", label: "Reels & Testimonials", icon: Clapperboard },
];

const inputCls = "form-input";
const Label = ({ children }) => <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{children}</label>;

const VideoUpload = ({ label, kind, link, mediaId, currentUrl, onKindChange, onLinkChange, onLinkSave, onUploaded, testid }) => {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState("");

  const pick = async (file) => {
    if (!file) return;
    if (!/^(video\/(mp4|webm|quicktime))$/.test(file.type)) {
      setErr("Please choose an MP4 or WebM video.");
      return;
    }
    if (file.size > 40 * 1024 * 1024) {
      setErr("Video is larger than 40 MB. For longer videos use the YouTube or Video Link option.");
      return;
    }
    setBusy(true);
    setErr("");
    setProgress(0);
    try {
      const media = await uploadMediaRaw(file);
      onUploaded(media.id);
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  const kindPill = (k, label) => (
    <button
      key={k}
      type="button"
      data-testid={`${testid}-kind-${k}`}
      onClick={() => onKindChange(k)}
      className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${kind === k ? "bg-[#BE185D] text-white shadow-md shadow-rose-200" : "border border-rose-200 bg-white text-slate-600 hover:border-[#BE185D] hover:text-[#BE185D]"}`}
    >
      {label}
    </button>
  );

  return (
    <div data-testid={testid}>
      <Label>{label}</Label>
      <div className="space-y-4 rounded-2xl border border-rose-100 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          {kindPill("upload", "Upload video (up to 40 MB)")}
          {kindPill("youtube", "YouTube video")}
          {kindPill("link", "Video link (MP4/WebM)")}
        </div>

        {kind === "upload" && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-[11px] font-bold text-[#0F766E]">
              <Video className="h-3.5 w-3.5" /> {mediaId ? "Custom video set" : "Default stock video"}
            </span>
            <label className="cursor-pointer rounded-full bg-[#BE185D] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#9F1239]">
              {busy ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : "Choose video (MP4/WebM, max 40 MB)"}
              <input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" data-testid={`${testid}-file-input`} onChange={(e) => pick(e.target.files?.[0])} />
            </label>
            {currentUrl && <a href={currentUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#BE185D] hover:underline">Preview current</a>}
            {mediaId && (
              <button type="button" onClick={() => onUploaded(null)} className="text-xs font-bold text-slate-400 hover:text-[#9F1239]">
                Reset to default
              </button>
            )}
            {progress > 0 && <p className="w-full text-[11px] font-semibold text-[#0F766E]">Uploading… {progress}%</p>}
          </div>
        )}

        {kind === "youtube" && (
          <div>
            <Label>YouTube URL or video ID</Label>
            <input
              data-testid={`${testid}-youtube-input`}
              className={inputCls}
              placeholder="https://www.youtube.com/watch?v=… or youtu.be/…"
              value={link}
              onChange={(e) => onLinkChange(e.target.value)}
            />
            <p className="mt-1.5 text-[11px] text-slate-400">
              Plays muted, looping and without controls as the hero background. Use an unlisted or public video — HD quality, no size limit.
            </p>
            <button data-testid={`${testid}-save-link`} onClick={onLinkSave} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#0F766E] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#0D9488]">
              <Save className="h-3.5 w-3.5" /> Save &amp; Apply
            </button>
          </div>
        )}

        {kind === "link" && (
          <div>
            <Label>Direct video URL (MP4 / WebM)</Label>
            <input
              data-testid={`${testid}-link-input`}
              className={inputCls}
              placeholder="https://example.com/hero-video.mp4"
              value={link}
              onChange={(e) => onLinkChange(e.target.value)}
            />
            <p className="mt-1.5 text-[11px] text-slate-400">
              Must be a direct video file link (ends with .mp4 / .webm) that allows embedding — e.g. your own CDN or hosting.
            </p>
            <button data-testid={`${testid}-save-link`} onClick={onLinkSave} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#0F766E] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#0D9488]">
              <Save className="h-3.5 w-3.5" /> Save &amp; Apply
            </button>
          </div>
        )}
      </div>
      {err && <p className="mt-2 text-[11px] font-semibold text-[#9F1239]">{err}</p>}
    </div>
  );
};

const ReelVideoPicker = ({ testid, mediaId, link, currentUrl, onUploaded, onLinkChange }) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const pick = async (file) => {
    if (!file) return;
    if (!/^video\/(mp4|webm|quicktime)$/.test(file.type)) {
      setErr("Please choose an MP4 or WebM video.");
      return;
    }
    if (file.size > 40 * 1024 * 1024) {
      setErr("Video is larger than 40 MB — use a direct video link instead.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const media = await uploadMediaRaw(file);
      onUploaded(media.id);
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid={testid}>
      <Label>Video (vertical 9:16 works best)</Label>
      <div className="space-y-3 rounded-2xl border border-rose-100 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold ${mediaId ? "bg-teal-50 text-[#0F766E]" : "bg-slate-100 text-slate-500"}`}>
            <Video className="h-3.5 w-3.5" /> {mediaId ? "Video uploaded" : link ? "Using link" : "No video yet"}
          </span>
          <label className="cursor-pointer rounded-full bg-[#BE185D] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#9F1239]">
            {busy ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : "Upload video (max 40 MB)"}
            <input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" data-testid={`${testid}-file-input`} onChange={(e) => pick(e.target.files?.[0])} />
          </label>
          {currentUrl && <a href={currentUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#BE185D] hover:underline">Preview current</a>}
          {mediaId && (
            <button type="button" onClick={() => onUploaded(null)} className="text-xs font-bold text-slate-400 hover:text-[#9F1239]">
              Remove video
            </button>
          )}
        </div>
        <input
          data-testid={`${testid}-link-input`}
          className={inputCls}
          placeholder="…or paste a direct video link (MP4 / WebM)"
          value={link}
          onChange={(e) => onLinkChange(e.target.value)}
        />
        {err && <p className="text-[11px] font-semibold text-[#9F1239]">{err}</p>}
      </div>
    </div>
  );
};

export default function ContentPage() {
  const [user] = useAdminAuth();
  const content = useContentStrict();
  const [tab, setTab] = useState("details");
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [newPhoto, setNewPhoto] = useState(null);
  const [newCaption, setNewCaption] = useState("");
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (content && !draft) setDraft(JSON.parse(JSON.stringify(content)));
  }, [content]);

  if (user === null || !content || !draft) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F5F2]">
        <p className="animate-pulse font-display text-2xl text-[#9F1239]">Loading console…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/admin" replace />;

  const save = async (section, payload) => {
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const { data } = await api.put("/admin/content", { [section]: payload });
      setDraft(JSON.parse(JSON.stringify(data)));
      await refetchContent();
      setMsg("Saved — the website is updated.");
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const setField = (section, key, value) =>
    setDraft((d) => ({ ...d, [section]: { ...d[section], [key]: value } }));

  return (
    <div className="min-h-screen bg-[#F8F5F2]">
      <Topbar user={user} active="content" />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <h1 className="font-display text-4xl font-semibold text-[#22090F]">Site Content</h1>
        <p className="mt-1.5 text-sm text-slate-500">Edit the details, photos and videos shown on your website — changes appear instantly.</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              data-testid={`content-tab-${t.id}`}
              onClick={() => { setTab(t.id); setMsg(""); setErr(""); }}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition-all ${tab === t.id ? "bg-[#BE185D] text-white shadow-md shadow-rose-200" : "border border-rose-200 bg-white text-slate-600 hover:border-[#BE185D] hover:text-[#BE185D]"}`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-6">
          {msg && <p data-testid="content-saved-alert" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{msg}</p>}
          {err && <p data-testid="content-error-alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-[#9F1239]">{err}</p>}

          {tab === "details" && (
            <div className="grid gap-4 rounded-3xl border border-rose-100 bg-white p-6 sm:grid-cols-2">
              <div>
                <Label>Institution Name</Label>
                <input data-testid="content-name-input" className={inputCls} value={draft.contact.name} onChange={(e) => setField("contact", "name", e.target.value)} />
              </div>
              <div>
                <Label>Tagline</Label>
                <input data-testid="content-tagline-input" className={inputCls} value={draft.contact.tagline} onChange={(e) => setField("contact", "tagline", e.target.value)} />
              </div>
              <div>
                <Label>Admissions Email</Label>
                <input data-testid="content-email-input" className={inputCls} value={draft.contact.email} onChange={(e) => setField("contact", "email", e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <input data-testid="content-phone-input" className={inputCls} value={draft.contact.phone} onChange={(e) => setField("contact", "phone", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Address</Label>
                <input data-testid="content-address-input" className={inputCls} value={draft.contact.address} onChange={(e) => setField("contact", "address", e.target.value)} />
              </div>
              <div>
                <Label>Instagram Handle</Label>
                <input data-testid="content-instagram-handle-input" className={inputCls} value={draft.contact.instagram} onChange={(e) => setField("contact", "instagram", e.target.value.replace("@", ""))} />
              </div>
              <div className="sm:col-span-2">
                <Label>Hero Stats</Label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {draft.hero.stats.map((s, i) => (
                    <div key={i} className="rounded-2xl bg-rose-50/50 p-3">
                      <input data-testid={`content-stat-n-${i}`} className={`${inputCls} mb-2`} value={s.n} onChange={(e) => { const stats = [...draft.hero.stats]; stats[i] = { ...stats[i], n: e.target.value }; setField("hero", "stats", stats); }} />
                      <input data-testid={`content-stat-l-${i}`} className={inputCls} value={s.l} onChange={(e) => { const stats = [...draft.hero.stats]; stats[i] = { ...stats[i], l: e.target.value }; setField("hero", "stats", stats); }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <button
                  data-testid="content-details-save-button"
                  onClick={async () => {
                    await save("contact", draft.contact);
                    await save("hero", { stats: draft.hero.stats });
                  }}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-6 py-2.5 text-xs font-bold text-white disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" /> Save Details
                </button>
              </div>
            </div>
          )}

          {tab === "hero" && (
            <div className="space-y-5">
              <div className="grid gap-4 rounded-3xl border border-rose-100 bg-white p-6 sm:grid-cols-3">
                {draft.hero.headline_lines.map((line, i) => (
                  <div key={i}>
                    <Label>Headline Line {i + 1}{i === 1 ? " (highlighted)" : ""}</Label>
                    <input data-testid={`content-headline-${i}-input`} className={inputCls} value={line} onChange={(e) => { const lines = [...draft.hero.headline_lines]; lines[i] = e.target.value; setField("hero", "headline_lines", lines); }} />
                  </div>
                ))}
                <div className="sm:col-span-3">
                  <Label>Hero Paragraph</Label>
                  <textarea data-testid="content-hero-sub-input" rows={3} className={`${inputCls} resize-none`} value={draft.hero.sub} onChange={(e) => setField("hero", "sub", e.target.value)} />
                </div>
              </div>

              <div className="rounded-3xl border border-rose-100 bg-white p-6">
                <VideoUpload
                  label="Hero Video"
                  testid="content-hero-video"
                  kind={draft.hero.video_kind || "upload"}
                  link={draft.hero.video_link || ""}
                  mediaId={draft.hero.video_media_id}
                  currentUrl={draft.hero.video_url}
                  onKindChange={(k) => save("hero", { ...draft.hero, video_kind: k })}
                  onLinkChange={(v) => setField("hero", "video_link", v)}
                  onLinkSave={() => save("hero", { ...draft.hero, video_kind: draft.hero.video_kind || "upload", video_link: draft.hero.video_link || "" })}
                  onUploaded={(mediaId) => save("hero", { ...draft.hero, video_media_id: mediaId, video_kind: "upload" })}
                />
              </div>

              <div className="rounded-3xl border border-rose-100 bg-white p-6">
                <p className="text-sm font-bold text-[#22090F]">Video sound</p>
                <p className="mt-1 text-xs text-slate-400">
                  Browsers always start videos muted — when sound is allowed, visitors get a &ldquo;Tap for sound&rdquo; button on the hero.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["muted", "on"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      data-testid={`content-hero-sound-${v}`}
                      onClick={() => save("hero", { ...draft.hero, video_sound: v })}
                      className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                        (draft.hero.video_sound || "muted") === v
                          ? "bg-[#BE185D] text-white shadow-md shadow-rose-200"
                          : "border border-rose-200 bg-white text-slate-600 hover:border-[#BE185D] hover:text-[#BE185D]"
                      }`}
                    >
                      {v === "muted" ? "Always mute" : "Allow sound"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-rose-100 bg-white p-6">
                <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#22090F]"><ImageIcon className="h-4 w-4 text-[#BE185D]" /> Cover photo (shown while the video loads)</p>
                <FileUpload
                  label="Hero Cover Photo"
                  testid="content-hero-poster"
                  value={draft.hero.poster_media_id ? draft.hero.poster_url : ""}
                  onChange={async (dataUrl) => {
                    if (!dataUrl) { save("hero", { ...draft.hero, poster_media_id: null }); return; }
                    try {
                      const blob = await (await fetch(dataUrl)).blob();
                      const media = await uploadMedia(new File([blob], "poster.jpg", { type: "image/jpeg" }));
                      save("hero", { ...draft.hero, poster_media_id: media.id });
                    } catch (e) { setErr(formatApiError(e)); }
                  }}
                />
              </div>
            </div>
          )}

          {tab === "gallery" && (
            <div className="space-y-5">
              <div className="rounded-3xl border border-rose-100 bg-white p-6">
                <p className="text-sm font-bold text-[#22090F]">Current photos</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {draft.gallery.photos.map((p, i) => (
                    <div key={p.id || i} data-testid={`content-gallery-photo-${i}`} className="flex items-start gap-3 rounded-2xl border border-rose-50 p-3">
                      <img src={p.img || p.url} alt="" className="h-16 w-16 rounded-xl object-cover" />
                      <div className="flex-1">
                        <input data-testid={`content-gallery-caption-${i}`} className={`${inputCls} mb-2 text-xs`} value={p.caption} onChange={(e) => { const photos = [...draft.gallery.photos]; photos[i] = { ...photos[i], caption: e.target.value }; setField("gallery", "photos", photos); }} />
                        <input data-testid={`content-gallery-tag-${i}`} className={`${inputCls} text-xs`} value={p.tag || ""} onChange={(e) => { const photos = [...draft.gallery.photos]; photos[i] = { ...photos[i], tag: e.target.value }; setField("gallery", "photos", photos); }} />
                      </div>
                      <button
                        data-testid={`content-gallery-remove-${i}`}
                        aria-label="Remove photo"
                        onClick={() => setField("gallery", "photos", draft.gallery.photos.filter((_, j) => j !== i))}
                        className="rounded-full p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-[#9F1239]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button data-testid="content-gallery-save-button" onClick={() => save("gallery", draft.gallery)} disabled={busy} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-6 py-2.5 text-xs font-bold text-white disabled:opacity-60">
                  <Save className="h-3.5 w-3.5" /> Save Gallery
                </button>
              </div>

              <div className="rounded-3xl border border-rose-100 bg-white p-6">
                <p className="text-sm font-bold text-[#22090F]">Add a photo</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <FileUpload
                    label="New photo"
                    testid="content-gallery-add-upload"
                    value={newPhoto}
                    onChange={setNewPhoto}
                  />
                  <div className="space-y-3">
                    <div>
                      <Label>Caption</Label>
                      <input data-testid="content-gallery-new-caption" className={inputCls} value={newCaption} onChange={(e) => setNewCaption(e.target.value)} />
                    </div>
                    <div>
                      <Label>Tag</Label>
                      <input data-testid="content-gallery-new-tag" className={inputCls} placeholder="Labs / Hostels / Library…" value={newTag} onChange={(e) => setNewTag(e.target.value)} />
                    </div>
                    <button
                      data-testid="content-gallery-add-button"
                      disabled={!newPhoto}
                      onClick={async () => {
                        try {
                          const blob = await (await fetch(newPhoto)).blob();
                          const media = await uploadMedia(new File([blob], "gallery.jpg", { type: "image/jpeg" }));
                          const photos = [...draft.gallery.photos, { id: `g-${Date.now()}`, media_id: media.id, caption: newCaption || "Campus moment", tag: newTag || "Campus" }];
                          await save("gallery", { photos });
                          setNewPhoto(null);
                          setNewCaption("");
                          setNewTag("");
                        } catch (e) { setErr(formatApiError(e)); }
                      }}
                      className="inline-flex items-center gap-2 rounded-full bg-[#0F766E] px-6 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add to Gallery
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "facilities" && (
            <div className="rounded-3xl border border-rose-100 bg-white p-6">
              <p className="mb-4 text-sm font-bold text-[#22090F]">Hostel photo (Facilities section)</p>
              <FileUpload
                label="Hostel Photo"
                testid="content-facilities-hostel"
                value={draft.facilities.hostel_media_id ? draft.facilities.hostel_img : ""}
                onChange={async (dataUrl) => {
                  if (!dataUrl) { save("facilities", { ...draft.facilities, hostel_media_id: null }); return; }
                  try {
                    const blob = await (await fetch(dataUrl)).blob();
                    const media = await uploadMedia(new File([blob], "hostel.jpg", { type: "image/jpeg" }));
                    save("facilities", { ...draft.facilities, hostel_media_id: media.id });
                  } catch (e) { setErr(formatApiError(e)); }
                }}
              />
            </div>
          )}

          {tab === "faq" && (
            <div className="rounded-3xl border border-rose-100 bg-white p-6">
              <p className="text-sm font-bold text-[#22090F]">Frequently asked questions</p>
              <p className="mt-1 text-xs text-slate-400">
                Shown in the FAQ section on the landing page — and marked up for Google rich results.
              </p>
              <div className="mt-4 space-y-3">
                {(draft.faq?.items || []).map((it, i) => (
                  <div key={i} data-testid={`content-faq-item-${i}`} className="rounded-2xl bg-rose-50/50 p-3">
                    <div className="flex items-center gap-2">
                      <input
                        data-testid={`content-faq-q-${i}`}
                        className={inputCls}
                        placeholder="Question"
                        value={it.q}
                        onChange={(e) => {
                          const items = [...(draft.faq?.items || [])];
                          items[i] = { ...items[i], q: e.target.value };
                          setField("faq", "items", items);
                        }}
                      />
                      <button
                        data-testid={`content-faq-remove-${i}`}
                        aria-label="Remove question"
                        onClick={() => setField("faq", "items", (draft.faq?.items || []).filter((_, j) => j !== i))}
                        className="rounded-full p-2 text-slate-400 transition-colors hover:bg-rose-100 hover:text-[#9F1239]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <textarea
                      data-testid={`content-faq-a-${i}`}
                      rows={3}
                      className={`${inputCls} mt-2 resize-none`}
                      placeholder="Answer"
                      value={it.a}
                      onChange={(e) => {
                        const items = [...(draft.faq?.items || [])];
                        items[i] = { ...items[i], a: e.target.value };
                        setField("faq", "items", items);
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  data-testid="content-faq-add-button"
                  onClick={() => setField("faq", "items", [...(draft.faq?.items || []), { q: "", a: "" }])}
                  className="inline-flex items-center gap-2 rounded-full bg-[#0F766E] px-6 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#0D9488]"
                >
                  <Plus className="h-3.5 w-3.5" /> Add question
                </button>
                <button
                  data-testid="content-faq-save-button"
                  onClick={() => save("faq", { items: draft.faq?.items || [] })}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-6 py-2.5 text-xs font-bold text-white disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" /> Save FAQ
                </button>
              </div>
            </div>
          )}

          {tab === "testimonials" && (
            <div className="space-y-5">
              <div className="rounded-3xl border border-teal-100 bg-teal-50/50 p-5">
                <p className="flex items-center gap-2 text-sm font-bold text-[#0F766E]"><Clapperboard className="h-4 w-4" /> Reels — video testimonials</p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600">
                  Short vertical videos from students and parents. The reels row is currently hidden from the website — when you&apos;re ready, ask to place it anywhere (e.g., above the enquiry form).
                  Upload an MP4 (up to 40 MB) or paste a direct video link, then add the student&apos;s name, programme and a short quote.
                  A reel without a video stays hidden.
                </p>
              </div>

              {(draft.testimonials?.items || []).map((it, i) => (
                <div key={it.id || i} data-testid={`content-reel-item-${i}`} className="rounded-3xl border border-rose-100 bg-white p-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-[#22090F]">Reel {i + 1}</p>
                    <button
                      data-testid={`content-reel-remove-${i}`}
                      aria-label="Remove reel"
                      onClick={() => setField("testimonials", "items", (draft.testimonials?.items || []).filter((_, j) => j !== i))}
                      className="rounded-full p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-[#9F1239]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <ReelVideoPicker
                      testid={`content-reel-video-${i}`}
                      mediaId={it.media_id || null}
                      link={it.video_link || ""}
                      currentUrl={it.video_url}
                      onUploaded={(mediaId) => {
                        const items = [...(draft.testimonials?.items || [])];
                        items[i] = { ...items[i], media_id: mediaId, video_link: mediaId ? "" : items[i].video_link };
                        setField("testimonials", "items", items);
                      }}
                      onLinkChange={(v) => {
                        const items = [...(draft.testimonials?.items || [])];
                        items[i] = { ...items[i], video_link: v, media_id: v ? null : items[i].media_id };
                        setField("testimonials", "items", items);
                      }}
                    />
                    <div className="space-y-4">
                      <div>
                        <Label>Name</Label>
                        <input
                          data-testid={`content-reel-name-${i}`}
                          className={inputCls}
                          placeholder="Student or parent name"
                          value={it.name || ""}
                          onChange={(e) => {
                            const items = [...(draft.testimonials?.items || [])];
                            items[i] = { ...items[i], name: e.target.value };
                            setField("testimonials", "items", items);
                          }}
                        />
                      </div>
                      <div>
                        <Label>Programme</Label>
                        <input
                          data-testid={`content-reel-programme-${i}`}
                          className={inputCls}
                          placeholder="B.Sc Nursing, 2nd Year"
                          value={it.programme || ""}
                          onChange={(e) => {
                            const items = [...(draft.testimonials?.items || [])];
                            items[i] = { ...items[i], programme: e.target.value };
                            setField("testimonials", "items", items);
                          }}
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Quote</Label>
                      <textarea
                        data-testid={`content-reel-quote-${i}`}
                        rows={2}
                        className={`${inputCls} resize-none`}
                        placeholder="What they say about studying here…"
                        value={it.quote || ""}
                        onChange={(e) => {
                          const items = [...(draft.testimonials?.items || [])];
                          items[i] = { ...items[i], quote: e.target.value };
                          setField("testimonials", "items", items);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex flex-wrap gap-3">
                <button
                  data-testid="content-reel-add-button"
                  onClick={() => setField("testimonials", "items", [...(draft.testimonials?.items || []), { id: `r-${Date.now()}`, media_id: null, video_link: "", name: "", programme: "", quote: "" }])}
                  className="inline-flex items-center gap-2 rounded-full bg-[#0F766E] px-6 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#0D9488]"
                >
                  <Plus className="h-3.5 w-3.5" /> Add reel
                </button>
                <button
                  data-testid="content-reel-save-button"
                  onClick={() => save("testimonials", { items: draft.testimonials?.items || [] })}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-6 py-2.5 text-xs font-bold text-white disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" /> Save Reels &amp; Testimonials
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
