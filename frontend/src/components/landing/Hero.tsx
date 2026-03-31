'use client';

/**
 * High-impact Hero Section for Landing Page.
 * Uses Framer Motion for premium animations and mesh gradients.
 */

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Rocket, Box, Cpu, Sparkles, ChevronRight, Play } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden mesh-gradient min-h-screen flex items-center">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px]" />

      <div className="container-custom relative z-10 grid lg:grid-cols-2 gap-16 items-center">
        {/* Text Content */}
        <div className="text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-sm font-semibold mb-6 tracking-wide"
          >
            <Sparkles className="w-4 h-4" />
            AI DevOps 2.0 is here
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl lg:text-7xl font-extrabold leading-[1.1] mb-6 text-white tracking-tight"
          >
            Deploy Any App in <span className="gradient-text">1 Click.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg lg:text-xl text-gray-400 mb-10 max-w-xl leading-relaxed"
          >
            Stop wasting hours on Dockerfiles and pipeline bugs. Our AI analyzes your code, 
            picks the best stack, and deploys it instantly on a global edge.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
          >
            <Link href="/login" className="btn-primary py-4 px-8 text-base no-underline group">
              Get Started for Free
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="#demo" 
              className="btn-secondary py-4 px-8 text-base no-underline flex items-center gap-2 border-white/5 hover:bg-white/5"
            >
              <Play className="w-4 h-4 fill-white" />
              Watch Demo
            </Link>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="mt-12 flex items-center justify-center lg:justify-start gap-6 grayscale opacity-40 hover:opacity-80 transition-opacity"
          >
            <div className="text-sm font-bold tracking-widest text-white/50 uppercase">POWERING TOP TEAMS</div>
            <div className="flex gap-4">
              <Box className="w-6 h-6 text-white" />
              <Cpu className="w-6 h-6 text-white" />
              <Rocket className="w-6 h-6 text-white" />
            </div>
          </motion.div>
        </div>

        {/* Visual Content: Floating Cards */}
        <div className="hidden lg:block relative">
          <div className="relative w-full aspect-square">
            {/* Main Center UI */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="glass-panel w-[400px] h-[300px] shadow-2xl relative overflow-hidden group">
                {/* Terminal simulation */}
                <div className="h-8 bg-black/40 flex items-center px-4 gap-1.5 border-b border-white/10">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
                <div className="p-6 font-mono text-sm space-y-2 opacity-80 group-hover:opacity-100 transition-opacity">
                  <div className="text-cyan-400">$ cloning repository...</div>
                  <div className="text-indigo-400"># detected next.js + node.js</div>
                  <div className="text-white">🚀 building container...</div>
                  <div className="text-emerald-400">✔ deployed to production</div>
                  <div className="text-white animate-pulse">_</div>
                </div>
              </div>
            </motion.div>

            {/* Floating Card: Build Time */}
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-10 left-0 glass-panel p-4 flex items-center gap-4 bg-white/5 border-white/10 shadow-xl"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-gray-500">Build Time</div>
                <div className="text-lg font-bold text-white leading-none">42.8s</div>
              </div>
            </motion.div>

            {/* Floating Card: AI Suggestion */}
            <motion.div
              animate={{ y: [0, 15, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-10 right-0 glass-panel p-5 w-64 bg-indigo-600/10 border-indigo-500/20 shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">AI Recommendation</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                Detected dependency mismatch. Should I fix the `package-lock.json`?
              </p>
              <div className="flex gap-2">
                <div className="flex-1 py-1 px-2 rounded-md bg-indigo-600 text-[10px] font-bold text-center text-white cursor-pointer hover:bg-indigo-500">Auto-Fix</div>
                <div className="py-1 px-3 rounded-md bg-white/5 text-[10px] font-bold text-gray-400 cursor-pointer">Skip</div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
