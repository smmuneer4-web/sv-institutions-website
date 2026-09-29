import { MapPin, Phone, Mail, ArrowUp } from "lucide-react";
import { scrollToId } from "@/lib/scroll";

const LINKS = [
  { label: "About", id: "#about" },
  { label: "Colleges", id: "#colleges" },
  { label: "Programs", id: "#courses" },
  { label: "Facilities", id: "#facilities" },
  { label: "Apply Now", id: "#apply" },
];

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer id="contact" className="bg-[#22090F] text-rose-50/70">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-4">
              <img
                src="/sv-logo.png"
                alt="S V College of Nursing logo"
                className="h-16 w-16 rounded-full bg-white object-cover ring-1 ring-white/20"
              />
              <div>
                <p className="font-display text-2xl font-semibold text-white">S V College of Nursing</p>
                <p className="eyebrow mt-1 text-[10px] text-teal-300">S V Group of Institutions</p>
              </div>
            </div>
            <p className="mt-6 max-w-sm text-sm leading-relaxed">
              Renowned across India for excellence in nursing education — shaping competent, compassionate
              healthcare professionals since our founding under the S V Group of Institutions.
            </p>
            <p className="mt-6 font-display text-xl italic text-rose-200">A Culture of Excellence in Learning</p>
          </div>

          <div className="lg:col-span-2">
            <p className="eyebrow text-teal-300">Explore</p>
            <ul className="mt-5 space-y-3">
              {LINKS.map((l) => (
                <li key={l.id}>
                  <button
                    data-testid={`footer-link-${l.id.slice(1)}`}
                    onClick={() => scrollToId(l.id)}
                    className="link-underline text-sm hover:text-white"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <p className="eyebrow text-teal-300">Institutions</p>
            <ul className="mt-5 space-y-3 text-sm">
              <li>S V College of Nursing</li>
              <li>D R Vijayakumari School of Nursing</li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <p className="eyebrow text-teal-300">Contact</p>
            <ul className="mt-5 space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                <span>80 Feet Ring Road, Near Bangalore University, Mallathahalli Bus Stop, Bangalore - 560056</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-rose-300" />
                <a href="tel:+919037041972" data-testid="footer-phone-link" className="link-underline hover:text-white">
                  +91 90370 41972
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-rose-300" />
                <a
                  href="mailto:littleflowergroupbng@gmail.com"
                  data-testid="footer-email-link"
                  className="link-underline break-all hover:text-white"
                >
                  littleflowergroupbng@gmail.com
                </a>
              </li>
            </ul>
            <button
              data-testid="footer-back-to-top-button"
              onClick={() => scrollToId("#top")}
              aria-label="Back to top"
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-white/80 transition-all duration-300 hover:border-teal-300 hover:text-teal-200"
            >
              Back to Top <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs sm:flex-row">
          <p>© {year} S V Group of Institutions. All rights reserved.</p>
          <p>Managed by the Sandesh Educational Cultural and Charitable Trust since 2002.</p>
        </div>
      </div>
    </footer>
  );
}
