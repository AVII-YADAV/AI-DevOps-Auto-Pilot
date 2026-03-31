'use client';

/**
 * Premium Glassmorphic Login Page.
 * Centered glass card with premium OAuth buttons.
 */

import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Rocket, Shield, Globe, Terminal, ChevronLeft } from 'lucide-react';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 mesh-gradient relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 blur-[130px] rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-500/20 blur-[130px] rounded-full" />

      {/* Floating Elements */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute top-20 right-20 opacity-20"
      >
        <Rocket className="w-16 h-16 text-white" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Back Link */}
        <Link 
          href="/" 
          className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors mb-12 no-underline group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        {/* glass Card */}
        <div className="glass-panel p-10 lg:p-12 shadow-2xl relative overflow-hidden border-white/20">
          {/* Top glow */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

          {/* Logo Area */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg mx-auto mb-6 floating">
              <Rocket className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-sm text-gray-400">Select your preferred platform to proceed</p>
          </div>

          {/* Social Buttons */}
          <div className="space-y-4">
            <button
              onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
              className="w-full flex items-center justify-center gap-4 bg-white hover:bg-gray-100 text-black font-bold py-4 rounded-xl transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] group"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <Globe className="w-5 h-5 text-indigo-600 transition-transform group-hover:rotate-12" />
              </div>
              Continue with Google
            </button>

            <button
              onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
              className="w-full flex items-center justify-center gap-4 bg-[#1a1a1a] hover:bg-[#222] text-white font-bold py-4 rounded-xl transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] border border-white/10 group"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <Terminal className="w-5 h-5 transition-transform group-hover:rotate-12" />
              </div>
              Continue with GitHub
            </button>
          </div>

          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <p className="text-xs text-gray-500 font-medium tracking-wide">
              By continuing, you agree to our <span className="hover:text-white cursor-pointer transition-colors uppercase">Terms of Service</span>.
            </p>
          </div>
        </div>
        
        {/* Footer info */}
        <p className="text-center mt-8 text-xs text-white/20 font-bold tracking-widest uppercase">
          SECURED BY NEXTAUTH.JS
        </p>
      </motion.div>
    </main>
  );
}
