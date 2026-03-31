import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import LiveDemo from '@/components/landing/LiveDemo';
import { Features, HowItWorks, CTA, Footer } from '@/components/landing/LandingSections';

/**
 * AI DevOps Auto-Pilot: World-class Landing Page.
 * Built with Next.js 15, Tailwind CSS, and Framer Motion.
 */

export const metadata = {
  title: 'AI DevOps Auto-Pilot | Deploy Any Repo Instantly',
  description: 'The world\'s most advanced AI-powered deployment platform. Fix errors automatically and ship in 1 click.',
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-indigo-500/30">
      {/* Premium Navbar */}
      <Navbar />

      {/* Hero Section */}
      <Hero />

      {/* Live Demo Console */}
      <LiveDemo />

      {/* Core Platform Features */}
      <Features />

      {/* Functional Flow */}
      <HowItWorks />

      {/* Main Conversion Point */}
      <CTA />

      {/* Minimal Footer */}
      <Footer />
    </div>
  );
}
