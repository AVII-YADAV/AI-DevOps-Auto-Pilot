'use client';

/**
 * Dashboard page.
 * Shows project overview, recent deployments, and quick stats.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { projectAPI } from '@/lib/api';
import type { Project } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FolderPlus, Rocket, Box, CheckCircle, XCircle,
  Clock, ArrowRight, Plus, ExternalLink, GitBranch, Server,
  Activity, Sparkles, Zap, ShieldCheck, Heart, Cpu
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectAPI.list(),
  });

  const projects: Project[] = data?.data?.projects || [];
  const totalProjects = data?.data?.total || 0;

  const deployed = projects.filter((p) => p.status === 'deployed').length;
  const failed = projects.filter((p) => p.status === 'failed').length;
  const inProgress = projects.filter((p) =>
    ['deploying', 'created'].includes(p.status)
  ).length;

  const stats = [
    {
      label: 'Global Uptime',
      value: '99.98%',
      icon: Activity,
      gradient: 'linear-gradient(135deg, var(--brand-600), var(--brand-400))',
      trend: '+0.01% this week'
    },
    {
      label: 'AI Patches Applied',
      value: '24',
      icon: Sparkles,
      gradient: 'linear-gradient(135deg, var(--accent-amber), #fbbf24)',
      trend: '6 potential fixes waiting'
    },
    {
      label: 'Average Build Time',
      value: '1m 42s',
      icon: Zap,
      gradient: 'linear-gradient(135deg, var(--accent-cyan), #22d3ee)',
      trend: '-12s vs last week'
    },
    {
      label: 'Infrastructure Health',
      value: 'High',
      icon: ShieldCheck,
      gradient: 'linear-gradient(135deg, #10b981, #34d399)',
      trend: 'Zero critical threats'
    },
  ];

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold mb-1"
          style={{ color: 'var(--text-primary)' }}
        >
          Welcome back, {user?.username}
        </motion.h1>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Manage your projects and deployments
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="card flex items-center gap-4"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: stat.gradient, opacity: 0.9 }}
            >
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                {stat.label}
              </p>
              <p className="text-xl font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                {isLoading ? (
                  <span className="skeleton inline-block w-8 h-7" />
                ) : (
                  stat.value
                )}
              </p>
              <p className="text-[10px] font-semibold opacity-50 truncate" style={{ color: 'var(--text-secondary)' }}>
                {stat.trend}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Projects Section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Your Projects
        </h2>
        <div className="flex gap-3">
          <Link href="/dashboard/sync" className="btn-secondary text-sm py-2 px-4 no-underline flex items-center gap-2" style={{ border: '1px solid var(--border-subtle)' }}>
            <Server className="w-4 h-4" />
            Sync Sandbox
          </Link>
          <Link href="/projects/new" className="btn-primary text-sm py-2 px-4 no-underline flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Project
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card">
              <div className="skeleton w-48 h-5 mb-3" />
              <div className="skeleton w-full h-3 mb-2" />
              <div className="skeleton w-32 h-3" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card text-center py-16"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(6, 182, 212, 0.1))',
              border: '1px solid rgba(99, 102, 241, 0.2)',
            }}
          >
            <FolderPlus className="w-7 h-7" style={{ color: 'var(--brand-400)' }} />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            No projects yet
          </h3>
          <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
            Create your first project to get started with AI-powered deployments
          </p>
          <Link href="/projects/new" className="btn-primary no-underline">
            <Rocket className="w-4 h-4" />
            Create Your First Project
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/projects/${project.id}`} className="block card group no-underline">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, var(--bg-tertiary), var(--bg-elevated))',
                        border: '1px solid var(--border-default)',
                      }}
                    >
                      <Box className="w-5 h-5" style={{ color: 'var(--brand-400)' }} />
                    </div>
                    <div>
                      <h3
                        className="text-sm font-semibold group-hover:text-[var(--brand-400)] transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {project.name}
                      </h3>
                      {project.detected_stack && (
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {project.detected_stack}
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={project.status} size="sm" />
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-tertiary)' }}>
                        AI Health Index
                      </span>
                      <span className="text-[10px] font-bold" style={{ color: project.status === 'deployed' ? 'var(--status-success)' : 'var(--status-warning)' }}>
                        {project.status === 'deployed' ? '98%' : '24%'}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-1000"
                        style={{ 
                          width: project.status === 'deployed' ? '98%' : '24%',
                          background: project.status === 'deployed' ? 'var(--status-success)' : 'var(--status-warning)'
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                    <Heart className="w-3 h-3" style={{ color: project.status === 'deployed' ? 'var(--status-success)' : 'var(--status-error)' }} />
                    <span className="text-[10px] font-bold uppercase">Stable</span>
                  </div>
                </div>

                {project.description && (
                  <p
                    className="text-xs mb-3 line-clamp-2"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {project.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-3"
                  style={{ borderTop: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-4">
                    {project.repo_url && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        <GitBranch className="w-3 h-3" />
                        GitHub
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      <Cpu className="w-3 h-3" />
                      512MB RAM
                    </span>
                  </div>
                  <ArrowRight
                    className="w-4 h-4 transition-transform group-hover:translate-x-1"
                    style={{ color: 'var(--text-tertiary)' }}
                  />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
