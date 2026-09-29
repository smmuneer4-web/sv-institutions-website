import React, { useEffect } from "react";
import "@/App.css";
import Lenis from "lenis";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import About from "@/components/About";
import Colleges from "@/components/Colleges";
import Courses from "@/components/Courses";
import Affiliations from "@/components/Affiliations";
import Facilities from "@/components/Facilities";
import ApplyForm from "@/components/ApplyForm";
import Footer from "@/components/Footer";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FFFDF9] text-[#22090F]">
          <p className="font-display text-3xl">Something went wrong. Please refresh.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    window.__lenis = lenis;
    let raf;
    const loop = (time) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      window.__lenis = null;
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="grain relative bg-[#FFFDF9] text-[#22090F]">
        <Navbar />
        <main>
          <Hero />
          <Marquee />
          <About />
          <Colleges />
          <Courses />
          <Affiliations />
          <Facilities />
          <ApplyForm />
        </main>
        <Footer />
      </div>
    </ErrorBoundary>
  );
}

export default App;
