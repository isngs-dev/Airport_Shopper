import SmoothScroll from "@/components/ui/SmoothScroll";
import Navbar from "@/components/ui/Navbar";
import Cursor from "@/components/ui/Cursor";
import ParticlesCanvas from "@/components/ui/ParticlesCanvas";
import FlightPath from "@/components/ui/FlightPath";
import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Steps from "@/components/sections/Steps";
import Payment from "@/components/sections/Payment";
import FinalCta from "@/components/sections/FinalCta";

export default function App() {
  return (
    <SmoothScroll>
      <div className="mesh-bg" aria-hidden />
      <ParticlesCanvas />
      <div className="grain" aria-hidden />
      <Cursor />
      <Navbar />
      <main id="main" tabIndex={-1} className="relative overflow-x-clip outline-none">
        <FlightPath />
        <Hero />
        <About />
        <Steps />
        <Payment />
        <FinalCta />
      </main>
    </SmoothScroll>
  );
}
