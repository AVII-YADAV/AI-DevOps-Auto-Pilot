'use client';

/**
 * Navigation sidebar component.
 * Displays app branding, navigation links, and user info.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  FolderPlus,
  Rocket,
  Bot,
  LogOut,
  Settings,
  ChevronRight,
  CreditCard,
} from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects/new', label: 'New Project', icon: FolderPlus },
  { href: '/dashboard/billing', label: 'Billing & Plans', icon: CreditCard },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] flex flex-col"
      style={{
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      {/* Brand */}
      <div className="p-6 pb-4">
        <Link href="/dashboard" className="flex items-center gap-3 no-underline">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--brand-600), var(--accent-cyan))',
            }}
          >
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Auto-Pilot
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              AI DevOps Platform
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 no-underline relative"
              style={{
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--bg-tertiary)' : 'transparent',
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                  style={{ background: 'var(--brand-500)' }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                />
              )}
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
              {isActive && (
                <ChevronRight className="w-4 h-4 ml-auto" style={{ color: 'var(--text-tertiary)' }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* AI Badge */}
      <div className="mx-3 mb-4 p-4 rounded-xl" style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(6, 182, 212, 0.1))',
        border: '1px solid rgba(99, 102, 241, 0.2)',
      }}>
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-4 h-4" style={{ color: 'var(--brand-400)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--brand-400)' }}>
            AI Powered
          </span>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Auto-detect stack, build, deploy &amp; debug with AI
        </p>
      </div>

      {/* User section */}
      {user && (
        <div
          className="p-4 mx-3 mb-3 rounded-xl flex items-center justify-between"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
              style={{
                background: 'linear-gradient(135deg, var(--brand-500), var(--accent-violet))',
                color: 'white',
              }}
            >
              {user.username[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {user.username}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                {user.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg transition-colors cursor-pointer"
            style={{ color: 'var(--text-tertiary)' }}
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
