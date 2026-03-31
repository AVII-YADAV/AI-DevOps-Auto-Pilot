'use client';

/**
 * Project details page.
 * Shows project info, deployment history, logs, and AI analysis.
 */

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectAPI, deployAPI } from '@/lib/api';
import type { Project, Deployment } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import LogViewer from '@/components/LogViewer';
import AIDebugPanel from '@/components/AIDebugPanel';
import AIBlueprintPanel from '@/components/AIBlueprintPanel';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Rocket, Trash2, ExternalLink, GitBranch,
  Clock, Terminal, Brain, Box, Loader2, StopCircle,
  Code, Layers, Sparkles
} from 'lucide-react';

type TabType = 'overview' | 'logs' | 'ai' | 'blueprint' | 'dockerfile';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedDeployment, setSelectedDeployment] = useState<string | null>(null);

  // Fetch project
  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ['project', resolvedParams.id],
    queryFn: () => projectAPI.get(resolvedParams.id),
    enabled: !!resolvedParams.id,
  });
  const project: Project | null = projectData?.data || null;

  // Fetch deployments
  const { data: deploymentsData, isLoading: deploymentsLoading } = useQuery({
    queryKey: ['deployments', resolvedParams.id],
    queryFn: () => deployAPI.listForProject(resolvedParams.id),
    refetchInterval: 5000,
    enabled: !!resolvedParams.id,
  });
  const deployments: Deployment[] = deploymentsData?.data || [];
  const latestDeployment = deployments[0] || null;
  const activeDeploymentId = selectedDeployment || latestDeployment?.id || null;

  // Deploy mutation
  const deployMutation = useMutation({
    mutationFn: () => deployAPI.deploy(resolvedParams.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments', resolvedParams.id] });
      queryClient.invalidateQueries({ queryKey: ['project', resolvedParams.id] });
      setActiveTab('logs');
    },
  });

  // Stop mutation
  const stopMutation = useMutation({
    mutationFn: (deploymentId: string) => deployAPI.stop(deploymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments', resolvedParams.id] });
      queryClient.invalidateQueries({ queryKey: ['project', resolvedParams.id] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => projectAPI.delete(resolvedParams.id),
    onSuccess: () => router.push('/dashboard'),
  });

  const isActive = ['deploying', 'cloning', 'building', 'running', 'pending'].includes(
    latestDeployment?.status || ''
  );

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: Layers },
    { id: 'logs' as TabType, label: 'Logs', icon: Terminal },
    { id: 'ai' as TabType, label: 'AI Debug', icon: Brain },
    { id: 'blueprint' as TabType, label: 'Blueprint', icon: Sparkles },
    { id: 'dockerfile' as TabType, label: 'Dockerfile', icon: Code },
  ];

  if (projectLoading) {
    return (
      <div className="max-w-6xl">
        <div className="skeleton w-48 h-7 mb-4" />
        <div className="skeleton w-full h-40 mb-4" />
        <div className="skeleton w-full h-96" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-6xl text-center py-20">
        <p className="text-lg" style={{ color: 'var(--text-tertiary)' }}>Project not found</p>
        <button onClick={() => router.push('/dashboard')} className="btn-primary mt-4">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <button
        onClick={() => router.push('/dashboard')}
        className="flex items-center gap-2 text-sm mb-6 cursor-pointer"
        style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Project Header Card */}
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, var(--bg-tertiary), var(--bg-elevated))',
                  border: '1px solid var(--border-default)',
                }}
              >
                <Box className="w-7 h-7" style={{ color: 'var(--brand-400)' }} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {project.name}
                  </h1>
                  <StatusBadge status={project.status} />
                </div>
                <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {project.detected_stack && (
                    <span className="flex items-center gap-1">
                      <Code className="w-3 h-3" />
                      {project.detected_stack}
                    </span>
                  )}
                  {project.repo_url && (
                    <a
                      href={project.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-[var(--brand-400)] transition-colors"
                    >
                      <GitBranch className="w-3 h-3" />
                      Repository
                    </a>
                  )}
                  {latestDeployment?.public_url && (
                    <a
                      href={latestDeployment.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-[var(--brand-400)] transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {latestDeployment.public_url}
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {latestDeployment?.status === 'deployed' && (
                <button
                  onClick={() => latestDeployment && stopMutation.mutate(latestDeployment.id)}
                  disabled={stopMutation.isPending}
                  className="btn-danger text-sm py-2"
                >
                  <StopCircle className="w-4 h-4" />
                  Stop
                </button>
              )}
              <button
                onClick={() => deployMutation.mutate()}
                disabled={deployMutation.isPending || isActive}
                className="btn-primary text-sm py-2"
              >
                {deployMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Rocket className="w-4 h-4" />
                )}
                Deploy
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this project and all its data?')) {
                    deleteMutation.mutate();
                  }
                }}
                className="btn-danger text-sm py-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 p-1 rounded-xl w-fit"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all"
              style={{
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                background: activeTab === tab.id ? 'var(--bg-tertiary)' : 'transparent',
                border: 'none',
              }}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Deployment History */}
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                Deployment History
              </h3>
              {deploymentsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="skeleton w-full h-16" />)}
                </div>
              ) : deployments.length === 0 ? (
                <div className="card text-center py-8">
                  <Rocket className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    No deployments yet. Click &quot;Deploy&quot; to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {deployments.map((dep, i) => (
                    <button
                      key={dep.id}
                      onClick={() => {
                        setSelectedDeployment(dep.id);
                        setActiveTab('logs');
                      }}
                      className="card w-full text-left cursor-pointer flex items-center justify-between"
                      style={{ padding: '16px 20px' }}
                    >
                      <div className="flex items-center gap-4">
                        <StatusBadge status={dep.status} size="sm" />
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            Deployment #{deployments.length - i}
                          </p>
                          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(dep.created_at).toLocaleString()}
                            </span>
                            {dep.port && (
                              <span>Port: {dep.port}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {dep.public_url && (
                        <a
                          href={dep.public_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs flex items-center gap-1"
                          style={{ color: 'var(--brand-400)' }}
                        >
                          <ExternalLink className="w-3 h-3" />
                          Live
                        </a>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'logs' && activeDeploymentId && (
            <motion.div
              key="logs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <LogViewer deploymentId={activeDeploymentId} isActive={isActive} />
            </motion.div>
          )}

          {activeTab === 'ai' && activeDeploymentId && (
            <motion.div
              key="ai"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AIDebugPanel deploymentId={activeDeploymentId} />
            </motion.div>
          )}

          {activeTab === 'blueprint' && (
            <motion.div
              key="blueprint"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AIBlueprintPanel projectId={resolvedParams.id} />
            </motion.div>
          )}

          {activeTab === 'dockerfile' && latestDeployment?.dockerfile_content && (
            <motion.div
              key="dockerfile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="px-4 py-3 flex items-center gap-2"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <Code className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Generated Dockerfile
                  </span>
                </div>
                <pre
                  className="p-4 overflow-auto text-sm"
                  style={{
                    background: 'var(--bg-primary)',
                    color: 'var(--text-secondary)',
                    fontFamily: "'JetBrains Mono', monospace",
                    lineHeight: 1.7,
                    maxHeight: '500px',
                  }}
                >
                  {latestDeployment.dockerfile_content}
                </pre>
              </div>
            </motion.div>
          )}

          {(activeTab === 'logs' || activeTab === 'ai') && !activeDeploymentId && (
            <div className="card text-center py-12">
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                No deployment selected. Deploy your project first.
              </p>
            </div>
          )}

          {activeTab === 'dockerfile' && !latestDeployment?.dockerfile_content && (
            <div className="card text-center py-12">
              <Code className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                No Dockerfile generated yet. Deploy your project to auto-generate one.
              </p>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
