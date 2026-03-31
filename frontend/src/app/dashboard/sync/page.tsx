'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { syncAPI } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket, Server, Terminal, Brain, ArrowLeft, Loader2, Link as LinkIcon, AlertTriangle
} from 'lucide-react';

export default function SyncDeployerPage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState('');
  const [error, setError] = useState('');
  
  // State for synchronous deploy results
  const [deployedProject, setDeployedProject] = useState<{
    project_id: string;
    url: string | null;
    status: string;
  } | null>(null);
  
  const [logs, setLogs] = useState<string>('');
  
  // AI Debug Results
  const [aiAnalysis, setAiAnalysis] = useState<{
    root_cause: string;
    explanation: string;
    fix: string;
    commands: string;
  } | null>(null);

  // Deploy Pipeline
  const deployMutation = useMutation({
    mutationFn: () => syncAPI.deploy(repoUrl),
    onSuccess: async (response) => {
      setDeployedProject(response.data);
      
      // Attempt to immediately fetch the attached logs
      try {
        const logResponse = await syncAPI.getLogs(response.data.project_id);
        setLogs(logResponse.data.logs);
      } catch (err) {
        setLogs("Warning: Could not fetch initial logs from db.");
      }
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Synchronous deployment failed.');
    },
  });

  // AI Debug Pipeline
  const aiMutation = useMutation({
    mutationFn: () => {
      if (!deployedProject) throw new Error("No payload to analyze");
      return syncAPI.analyzeAi(deployedProject.project_id);
    },
    onSuccess: (res) => {
       setAiAnalysis(res.data);
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'AI Analysis completely failed. Check API Key.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAiAnalysis(null);
    if (!repoUrl.trim() || !repoUrl.startsWith('http')) {
      setError('Please provide a valid GitHub HTTP repository URL');
      return;
    }
    deployMutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Back Header */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm mb-6 cursor-pointer"
        style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(135deg, var(--brand-500), #a855f7)' }}
        >
          <Server className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Synchronous Engine Sandbox
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Test the single-pass clone -&gt; build -&gt; proxy -&gt; run -&gt; fetch pipeline.
          </p>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 mb-6 rounded-xl flex items-center gap-3 text-sm font-medium border border-red-500/20 bg-red-500/10 text-red-500"
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          {error}
        </motion.div>
      )}

      {/* Controller Block */}
      <div className="card mb-8">
        <form onSubmit={handleSubmit} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Target Repository URL
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              <input
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="input-field pl-11"
                placeholder="https://github.com/expressjs/express"
                required
                disabled={deployMutation.isPending}
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={deployMutation.isPending}
            className="btn-primary"
            style={{ padding: '0 32px', height: '44px' }}
          >
            {deployMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Rocket className="w-5 h-5" />
            )}
            <span className="ml-2 font-semibold">Fire</span>
          </button>
        </form>
      </div>

      <AnimatePresence>
        {(deployedProject || deployMutation.isPending) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left Block: Terminal Dump */}
            <div className="lg:col-span-2 space-y-6">
              <div className="card shadow-md flex flex-col h-[500px]" style={{ padding: 0 }}>
                <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4" style={{ color: 'var(--brand-400)' }} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Terminal Logs Wrapper</span>
                  </div>
                  <div className="text-xs font-mono px-2 py-1 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                    ID: {deployedProject ? deployedProject.project_id : 'Initializing...'}
                  </div>
                </div>
                
                <div className="flex-1 overflow-auto p-4 bg-black/90 font-mono text-xs" style={{ color: '#00ff00', lineHeight: 1.6 }}>
                  {deployMutation.isPending ? (
                    <div className="flex flex-col items-center justify-center h-full text-indigo-400 gap-4 opacity-70">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <p>Cloning repository and executing Docker build sequence...</p>
                      <p className="text-xs">This operation may block securely for up to 60s.</p>
                    </div>
                  ) : (
                     <pre className="whitespace-pre-wrap font-inherit">{logs || 'No logs captured. Container likely built successfully but has no stdout output yet.'}</pre>
                  )}
                </div>
              </div>
            </div>

            {/* Right Block: Actions */}
            <div className="space-y-6">
              <div className="card shadow-md">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Server className="w-4 h-4" /> Resulting Proxy
                </h3>
                {deployedProject ? (
                  deployedProject.url ? (
                    <a href={deployedProject.url} target="_blank" rel="noreferrer" className="block w-full p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all text-center">
                      <span className="block text-sm font-bold text-indigo-400 mb-1">Status: {deployedProject.status}</span>
                      <span className="text-sm border-b border-indigo-400/50 pb-0.5">{deployedProject.url}</span>
                    </a>
                  ) : (
                    <div className="w-full p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-center">
                      <span className="block text-red-500 text-sm font-bold">Failed via Error</span>
                      <span className="block text-red-400/70 text-xs mt-2 truncate">{deployedProject.status}</span>
                    </div>
                  )
                ) : (
                  <div className="w-full p-4 rounded-xl border border-dashed border-gray-500/30 text-center text-gray-500 text-sm">
                    Awaiting target container bind...
                  </div>
                )}
              </div>

              <div className="card shadow-md">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Brain className="w-4 h-4" /> AI Diagnostics
                </h3>
                
                <button
                  onClick={() => aiMutation.mutate()}
                  disabled={aiMutation.isPending || !deployedProject}
                  className="w-full flex items-center gap-2 justify-center py-3 rounded-xl text-sm font-medium text-white transition-all shadow hover:shadow-lg disabled:opacity-50"
                  style={{ background: 'linear-gradient(to right, #6366f1, #a855f7)' }}
                >
                  {aiMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                  Ask AI Core to Detect Issues
                </button>
              </div>

              {aiAnalysis && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="card border-purple-500/30 shadow-xl overflow-hidden shadow-purple-500/10 mb-8 mx-0">
                  <h4 className="flex items-center gap-2 text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                    <Brain className="w-4 h-4 text-purple-500" /> Diagnosis Profile
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <span className="block text-xs uppercase font-bold text-purple-500 mb-1">Root Failure</span>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{aiAnalysis.root_cause}</p>
                    </div>
                    <div>
                      <span className="block text-xs uppercase font-bold text-blue-500 mb-1">Explanation Base</span>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{aiAnalysis.explanation}</p>
                    </div>
                    <div className="p-3 bg-black/20 rounded-lg border border-white/5 mx-0 mt-4 mb-2 overflow-x-auto w-full max-w-full">
                      <span className="block text-xs uppercase font-bold text-green-500 mb-1 flex items-center gap-2">Execute Over Shell</span>
                      <code className="text-xs text-green-400 font-mono tracking-wide mt-2 block w-full">{aiAnalysis.commands}</code>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
