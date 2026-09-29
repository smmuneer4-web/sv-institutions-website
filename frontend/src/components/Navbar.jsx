import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { scrollToId } from "@/lib/scroll";

const LINKS = [
  { label: "About", id: "#about" },
  { label: "Colleges", id: "#colleges" },
  { label: "Programs", id: "#courses" },
  { label: "Gallery", id: "#gallery" },
  { label: "Facilities", id: "#facilities" },
  { label: "Contact", id: "#contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const go = (id) => {
    setOpen(false);
    setTimeout(() => scrollToId(id), open ? 80 : 0);
  };
  const goApply = () => {
    setOpen(false);
    navigate("/apply");
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-rose-100/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-5 lg:px-10">
          <button
            data-testid="nav-home-logo"
            onClick={() => navigate("/")}
            className="flex items-center gap-3"
            aria-label="S V Group of Institutions home"
          >
            <img
              src="/sv-logo.png"
              alt="S V Group of Institutions logo"
              className="h-12 w-12 rounded-full bg-white object-cover ring-1 ring-rose-100"
            />
            <span className="text-left leading-tight">
              <span className="block font-display text-2xl font-semibold tracking-tight text-[#22090F]">
                S V GROUP OF INSTITUTIONS
              </span>
            </span>
          </button>

          <nav className="hidden items-center gap-7 xl:flex">
            {LINKS.map((l) => (
              <button
                key={l.id}
                data-testid={`nav-link-${l.id.slice(1)}`}
                onClick={() => go(l.id)}
                className="link-underline text-sm font-medium text-slate-600 transition-colors hover:text-[#BE185D]"
              >
                {l.label}
              </button>
            ))}
            <button
              data-testid="nav-apply-btn"
              onClick={goApply}
              className="group inline-flex items-center gap-2 rounded-full bg-[#BE185D] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-900/20 transition-all duration-300 hover:scale-[1.04] hover:bg-[#9F1239]"
            >
              Apply Now
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </button>
          </nav>

          <div className="flex items-center gap-2 xl:hidden">
            <button
              data-testid="nav-apply-btn-mobile-inline"
              onClick={goApply}
              className="hidden items-center rounded-full bg-[#BE185D] px-5 py-2.5 text-xs font-semibold text-white sm:inline-flex"
            >
              Apply Now
            </button>
            <button
              data-testid="mobile-menu-button"
              className="rounded-full p-2 text-[#22090F]"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            data-testid="mobile-menu-panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[70] flex flex-col bg-[#6E0A28] px-6 py-6 text-white"
          >
            <div className="flex items-center justify-between">
              <img src="/sv-logo.png" alt="S V logo" className="h-12 w-12 rounded-full bg-white object-cover" />
              <button
                data-testid="mobile-menu-close-button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-full border border-white/25 p-2"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="mt-10 flex flex-col gap-1 overflow-y-auto">
              {LINKS.map((l, i) => (
                <motion.button
                  key={l.id}
                  data-testid={`mobile-nav-link-${l.id.slice(1)}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => go(l.id)}
                  className="border-b border-white/10 py-4 text-left font-display text-3xl font-medium"
                >
                  {l.label}
                </motion.button>
              ))}
              <motion.button
                data-testid="mobile-nav-application-portal"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                onClick={goApply}
                className="border-b border-white/10 py-4 text-left font-display text-3xl font-medium italic text-teal-200"
              >
                Application Portal
              </motion.button>
            </nav>
            <button
              data-testid="mobile-apply-btn"
              onClick={goApply}
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-4 text-base font-semibold text-[#9F1239]"
            >
              Apply Now <ArrowUpRight className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
