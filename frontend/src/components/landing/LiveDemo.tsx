'use client';

/**
 * Premium Live Demo Section.
 * Features an interactive-looking terminal and AI-powered patch suggestion.
 */

import { motion } from 'framer-motion';
import { Terminal, Sparkles, CheckCircle, ArrowRight } from 'lucide-react';

export default function LiveDemo() {
  return (
    <section id="demo" className="py-24 relative bg-black/40 overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-indigo-500/10 blur-[130px] rounded-full" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan-400/10 blur-[130px] rounded-full" />

      <div className="container-custom relative z-10 grid lg:grid-cols-2 gap-20 items-center">
        {/* Left Side: Terminal Visual */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="relative"
        >
          {/* Glass Card Terminal */}
          <div className="glass-panel p-1 rounded-3xl shadow-2xl overflow-hidden border-white/20 bg-black/60">
            {/* Header */}
            <div className="h-10 bg-white/5 border-b border-white/10 flex items-center justify-between px-6">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/40" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/40" />
                <div className="w-3 h-3 rounded-full bg-green-500/40" />
              </div>
              <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">build_log.sh — user@auto-pilot</span>
              <div className="w-10 h-1 group" />
            </div>

            {/* Content */}
            <div className="p-8 font-mono text-sm space-y-4">
              <div className="text-gray-500">2026-03-31 13:42:01 INFO: Initializing build container...</div>
              <div className="text-gray-500">2026-03-31 13:42:04 INFO: Detected Node.js environment.</div>
              <div className="text-cyan-400">$ npm install</div>
              <div className="text-gray-500">... installing dependencies</div>
              <div className="text-red-400 font-bold">2026-03-31 13:42:15 ERROR: Build failed.</div>
              <div className="text-red-400/80 mt-1 pl-4 border-l border-red-500/20 italic">
                Reason: Peer dependency conflict for 'react' (^18.x.x vs ^19.0.0)
              </div>
              <div className="text-white animate-pulse">_</div>
            </div>
          </div>

          {/* AI Suggestion Card Overlapping the Terminal */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1, type: "spring" }}
            className="absolute -bottom-8 -right-8 w-80 glass-panel p-6 shadow-2xl bg-indigo-900/40 border-indigo-500/30 backdrop-blur-3xl"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/30 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <span className="text-xs font-bold text-white uppercase tracking-widest">AI Fix Available</span>
            </div>
            
            <p className="text-sm text-gray-300 leading-relaxed mb-6">
              I found the issue. The <span className="text-indigo-400 font-bold">react</span> peer dependency is outdated in <span className="text-indigo-400 italic">package.json</span>.
            </p>

            <div className="space-y-3">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-colors">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Proposed Patch</span>
                  <span className="text-xs text-white">Upgrade to React 19</span>
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
              </div>
              
              <button className="w-full btn-primary py-3 text-xs shadow-indigo-500/20 shadow-lg">
                Apply Fix & Re-deploy
              </button>
            </div>
          </motion.div>
        </motion.div>

        {/* Right Side: Text & Selling Point */}
        <motion.div
           initial={{ opacity: 0, x: 50 }}
           whileInView={{ opacity: 1, x: 0 }}
           viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold mb-6">
            <Terminal className="w-3.5 h-3.5" />
            LIVE ANALYST
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-8 tracking-tight">
            The DevOps Expert <br />That <span className="gradient-text">Never Sleeps.</span>
          </h2>
          <div className="space-y-8">
            <div className="flex gap-5">
              <div className="w-12 h-12 rounded-2xl glass-panel flex items-center justify-center shrink-0 border-white/5 group hover:border-indigo-500/30 transition-colors">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white mb-2">Automated RCA</h4>
                <p className="text-gray-400 leading-relaxed">
                  Every error log is immediately parsed by our proprietary AI model to find Root Cause.
                  No more manually digging through thousands of lines of code.
                </p>
              </div>
            </div>
            
            <div className="flex gap-5">
              <div className="w-12 h-12 rounded-2xl glass-panel flex items-center justify-center shrink-0 border-white/5 group hover:border-indigo-500/30 transition-colors">
                <Zap className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white mb-2">One-Click Resolution</h4>
                <p className="text-gray-400 leading-relaxed">
                  Accept the AI patch and we automatically commit it to your preview branch and trigger a fresh deployment. 
                  DevOps uptime, solved.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Zap(props: any) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 14.71 12 3.5v9h8L12 20.5v-9H4Z" />
      </svg>
    )
  }
