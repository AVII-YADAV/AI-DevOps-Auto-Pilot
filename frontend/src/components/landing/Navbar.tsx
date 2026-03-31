'use client';

/**
 * Premium Glassmorphic Navbar for Landing Page.
 */

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Rocket, Shield } from 'lucide-react';

export default function Navbar() {
  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 glass-navbar py-4"
    >
      <div className="container-custom flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group no-underline">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Rocket className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Auto-Pilot
          </span>
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center gap-8">
          {['Features', 'How it Works', 'Pricing'].map((item) => (
            <Link 
              key={item} 
              href={`#${item.toLowerCase().replace(/ /g, '-')}`}
              className="text-sm font-medium text-gray-400 hover:text-white transition-colors no-underline"
            >
              {item}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Link 
            href="/login" 
            className="hidden sm:inline-flex text-sm font-medium text-gray-400 hover:text-white transition-colors no-underline px-4 py-2"
          >
            Login
          </Link>
          <Link 
            href="/login" 
            className="btn-primary no-underline text-xs"
          >
            Get Started
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
