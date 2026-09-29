const ITEMS = [
  "A Culture of Excellence in Learning",
  "Affiliated to RGUHS",
  "Recognised by INC",
  "Approved by KSNC",
  "Clinical Training in Leading Hospitals",
];

const Row = ({ hidden }) => (
  <div aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
    {ITEMS.map((item) => (
      <span key={item} className="flex items-center">
        <span className="whitespace-nowrap px-8 font-display text-xl font-medium italic text-white sm:text-2xl">
          {item}
        </span>
        <span className="h-2.5 w-2.5 rotate-45 bg-teal-300/90" />
      </span>
    ))}
  </div>
);

export default function Marquee() {
  return (
    <section data-testid="brand-marquee" className="relative overflow-hidden py-6">
      <div className="-mx-6 -rotate-1 bg-[#9F1239] py-5 shadow-lg shadow-rose-900/20">
        <div className="marquee-track">
          <Row />
          <Row hidden />
        </div>
      </div>
    </section>
  );
}
