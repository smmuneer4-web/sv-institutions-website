import React, { useEffect } from "react";
import Lenis from "lenis";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import "./App.css";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Marquee from "./components/Marquee";
import About from "./components/About";
import Colleges from "./components/Colleges";
import Courses from "./components/Courses";
import Gallery from "./components/Gallery";
import Affiliations from "./components/Affiliations";
import Facilities from "./components/Facilities";
import ApplyForm from "./components/ApplyForm";
import Footer from "./components/Footer";
import ApplyPage from "./pages/ApplyPage";
import AdminPage from "./pages/AdminPage";
import StudentsPage from "./pages/StudentsPage";
import StudentDetailPage from "./pages/StudentDetailPage";
import CollegesManager from "./pages/CollegesManager";

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

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Landing() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <About />
        <Colleges />
        <Courses />
        <Gallery />
        <Affiliations />
        <Facilities />
        <ApplyForm />
      </main>
      <Footer />
    </>
  );
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
      <BrowserRouter>
        <ScrollToTop />
        <div className="grain relative bg-[#FFFDF9] text-[#22090F]">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/apply" element={<ApplyPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/colleges" element={<CollegesManager />} />
            <Route path="/admin/students" element={<StudentsPage />} />
            <Route path="/admin/students/:ref" element={<StudentDetailPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
