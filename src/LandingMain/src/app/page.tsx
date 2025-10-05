import BenefitsSection from "@/components/sections/benefits-section";
import EndCTASection from "@/components/sections/end-cta-section";
import HeroSection from "@/components/sections/hero-section";
import HowItWorksSection from "@/components/sections/how-it-works-section";
import ProblemSection from "@/components/sections/problem-section";
import Testamonials from "@/components/sections/testamonials";

export default function Home() {
  return (
    <div className="px-2 sm:px-4 mx-auto border-x relative">
      {/* Borders */}
      <div className="block w-px h-full border-l border-border absolute top-0 left-2 sm:left-4 z-10"></div>
      <div className="block w-px h-full border-r border-border absolute top-0 right-2 sm:right-4 z-10"></div>

      {/* Content */}
      <main className="flex flex-col items-center justify-center divide-y divide-border min-h-screen w-full">
        {/* Hero */}
        <HeroSection />
        {/* Problem */}
        <ProblemSection />
        {/* HIW */}
        <HowItWorksSection />
        {/* Benefits */}
        <BenefitsSection />
        {/* Testamonials */}
        <Testamonials />
        {/* End CTA */}
        <EndCTASection />
      </main>
    </div>
  );
}
