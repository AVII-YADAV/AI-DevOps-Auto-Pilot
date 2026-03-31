'use client';

/**
 * Secondary sections for Landing Page.
 * Includes Features, How It Works, and CTA.
 */

import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  Rocket, Terminal, Brain, Activity, Globe, Zap, Shield, 
  ChevronRight, ArrowRight, Share2, Globe2, Command
} from 'lucide-react';

/* ─────────────────────────────────────────
   FEATURES SECTION
   ───────────────────────────────────────── */
const features = [
  {
    icon: Rocket,
    title: "One-Click Deployment",
    description: "Push your repo and we handle the rest. Automatic cloning, building, and serving.",
    color: "var(--brand-400)"
  },
  {
    icon: Brain,
    title: "AI Analysis Engine",
    description: "Real-time analysis of build logs to identify and suggest technical fixes instantly.",
    color: "var(--accent-cyan)"
  },
  {
    icon: Activity,
    title: "Real-time Edge Monitoring",
    description: "Global monitoring stations watch your app's health and scale automatically.",
    color: "var(--accent-violet)"
  },
  {
    icon: Globe,
    title: "Global CDN Edge",
    description: "Deploy to 300+ edge locations for sub-10ms latency for all your users.",
    color: "var(--accent-emerald)"
  }
];

export function Features() {
  return (
    <section id="features" className="py-24 relative overflow-hidden bg-black/20">
      <div className="container-custom relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold mb-6 text-white tracking-tight">
            Everything You Need to <span className="gradient-text">Ship Faster.</span>
          </h2>
          <p className="text-lg text-gray-400 leading-relaxed">
            A complete platform built for the modern engineer. From automated Dockerfiles 
            to AI-powered scaling—we've got you covered.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel p-8 group hover:border-[var(--brand-400)] hover:bg-white/5 transition-all duration-300"
            >
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-xl"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
              >
                <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   HOW IT WORKS SECTION
   ───────────────────────────────────────── */
const steps = [
  { num: "01", title: "Upload Repo", desc: "Connect your GitHub account or paste any public repository URL." },
  { num: "02", title: "Deploy Instantly", desc: "Our AI auto-builds your Docker image and ships it to the edge." },
  { num: "03", title: "AI Fixes Errors", desc: "If anything breaks, AI suggests the patch and re-deploys for you." }
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 relative mesh-gradient">
      <div className="container-custom">
        <div className="text-center mb-20">
          <h2 className="text-3xl lg:text-5xl font-bold mb-4 text-white">How It Works</h2>
          <div className="w-24 h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 mx-auto" />
        </div>

        <div className="grid lg:grid-cols-3 gap-12 relative">
          {/* Connector lines (Desktop) */}
          <div className="hidden lg:block absolute top-[60px] left-[10%] right-[10%] h-px bg-white/10" />

          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="relative z-10 text-center flex flex-col items-center"
            >
              <div className="w-32 h-32 rounded-full glass-panel flex items-center justify-center mb-8 border border-indigo-500/30 group bg-indigo-600/5 hover:bg-indigo-600/10 transition-colors">
                <span className="text-4xl font-extrabold gradient-text">{step.num}</span>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">{step.title}</h3>
              <p className="text-sm text-gray-400 max-w-[280px] mx-auto leading-relaxed">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   CTA SECTION
   ───────────────────────────────────────── */
export function CTA() {
  return (
    <section className="py-24 container-custom">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="glass-panel p-12 lg:p-20 relative overflow-hidden rounded-[40px] text-center"
        style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(6, 182, 212, 0.1))' }}
      >
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/30 blur-[140px] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <h2 className="text-4xl lg:text-6xl font-bold mb-8 text-white tracking-tight">
            Ready to <span className="gradient-text">Automate</span> Your DevOps?
          </h2>
          <p className="text-lg lg:text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Join 5,000+ developers shipping world-class apps on Auto-Pilot. 
            No credit card required. Free tier forever.
          </p>
          <Link href="/login" className="btn-primary py-4 px-10 text-lg no-underline group shadow-2xl">
            Go to Console
            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

/* ─────────────────────────────────────────
   FOOTER SECTION
   ───────────────────────────────────────── */
export function Footer() {
  return (
    <footer className="py-20 border-t border-white/5 relative z-10">
      <div className="container-custom grid lg:grid-cols-4 gap-12">
        <div className="lg:col-span-2">
          <Link href="/" className="flex items-center gap-2 group no-underline mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">Auto-Pilot</span>
          </Link>
          <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
            Specialized in automated deployment systems and AI-powered log analysis. 
            Built for modern high-performance engineering teams.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-white mb-6">Product</h4>
          <ul className="space-y-4 p-0 list-none text-sm text-gray-400 font-medium">
            <li className="hover:text-white cursor-pointer transition-colors">Features</li>
            <li className="hover:text-white cursor-pointer transition-colors">Integrations</li>
            <li className="hover:text-white cursor-pointer transition-colors">Enterprise</li>
            <li className="hover:text-white cursor-pointer transition-colors">Changelog</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-white mb-6">Connect</h4>
          <div className="flex gap-4">
            {[Share2, Globe2, Command].map((Icon, i) => (
              <div key={i} className="w-10 h-10 rounded-xl glass-panel flex items-center justify-center hover:bg-white/5 hover:border-white/20 cursor-pointer transition-all">
                <Icon className="w-5 h-5 text-gray-400 hover:text-white" />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="container-custom pt-12 mt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-xs text-gray-500">© 2026 AI DevOps Auto-Pilot. All rights reserved.</p>
        <div className="flex gap-8 text-xs text-gray-500 font-medium tracking-wide">
          <span className="hover:text-white cursor-pointer transition-colors uppercase">Privacy</span>
          <span className="hover:text-white cursor-pointer transition-colors uppercase">Terms</span>
        </div>
      </div>
    </footer>
  );
}
