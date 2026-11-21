import AnnouncementBar from "@/components/marketing/AnnouncementBar";
import Navbar from "@/components/marketing/Navbar";
import HeroSection from "@/components/marketing/HeroSection";
import FeatureTabSwitcher from "@/components/marketing/FeatureTabSwitcher";
import CreatorLogoStrip from "@/components/marketing/CreatorLogoStrip";
import AIModelsSection from "@/components/marketing/AIModelsSection";
import WorkflowSection from "@/components/marketing/WorkflowSection";
import TestimonialsMarquee from "@/components/marketing/TestimonialsMarquee";
import FaqAccordion from "@/components/marketing/FaqAccordion";
import FinalCta from "@/components/marketing/FinalCta";
import Footer from "@/components/marketing/Footer";
import CookieBanner from "@/components/marketing/CookieBanner";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background-deep text-text-primary flex flex-col">
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <CreatorLogoStrip />
        <FeatureTabSwitcher />
        <AIModelsSection />
        <WorkflowSection />
        <TestimonialsMarquee />
        <FaqAccordion />
        <FinalCta />
      </main>
      <Footer />
      <CookieBanner />
    </div>
  );
}
