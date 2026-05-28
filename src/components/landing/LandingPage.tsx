import { CtaSection } from "./CtaSection";
import { FeaturesBento } from "./FeaturesBento";
import { Hero } from "./Hero";
import { LandingFooter } from "./LandingFooter";
import { MetricsStrip } from "./MetricsStrip";
import { Navbar } from "./Navbar";
import { Testimonials } from "./Testimonials";
import { WorkflowSteps } from "./WorkflowSteps";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-surface)] text-[var(--text-primary)]">
      <Navbar />
      <Hero />
      <MetricsStrip />
      <FeaturesBento />
      <WorkflowSteps />
      <Testimonials />
      <CtaSection />
      <LandingFooter />
    </main>
  );
}
