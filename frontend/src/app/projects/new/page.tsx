'use client';

/**
 * Create new project page.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { projectAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import {
  FolderPlus, GitBranch, Upload, ArrowLeft, Rocket, Loader2, Link as LinkIcon
} from 'lucide-react';

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [sourceType, setSourceType] = useState<'github' | 'zip'>('github');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: () =>
      projectAPI.create({
        name,
        description: description || undefined,
        repo_url: repoUrl || undefined,
        source_type: sourceType,
      }),
    onSuccess: (response) => {
      router.push(`/projects/${response.data.id}`);
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to create project');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    if (sourceType === 'github' && !repoUrl.trim()) {
      setError('Repository URL is required for GitHub projects');
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm mb-6 cursor-pointer"
        style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--brand-600), var(--accent-cyan))',
            }}
          >
            <FolderPlus className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Create New Project
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Add a GitHub repo and deploy it instantly
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl text-sm"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#f87171',
              }}
            >
              {error}
            </motion.div>
          )}

          {/* Source type selector */}
          <div>
            <label className="block text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              Source Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSourceType('github')}
                className="card flex items-center gap-3 cursor-pointer text-left"
                style={{
                  borderColor: sourceType === 'github' ? 'var(--brand-500)' : 'var(--border-subtle)',
                  background: sourceType === 'github' ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-card)',
                }}
              >
                <GitBranch className="w-5 h-5" style={{ color: sourceType === 'github' ? 'var(--brand-400)' : 'var(--text-tertiary)' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>GitHub</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Clone from repository
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSourceType('zip')}
                className="card flex items-center gap-3 cursor-pointer text-left"
                style={{
                  borderColor: sourceType === 'zip' ? 'var(--brand-500)' : 'var(--border-subtle)',
                  background: sourceType === 'zip' ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-card)',
                }}
              >
                <Upload className="w-5 h-5" style={{ color: sourceType === 'zip' ? 'var(--brand-400)' : 'var(--text-tertiary)' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>ZIP Upload</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Upload source code
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Project name */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="my-awesome-app"
              required
              id="project-name"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Description <span style={{ color: 'var(--text-tertiary)' }}>(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              placeholder="A brief description of your project"
              rows={3}
              style={{ resize: 'vertical' }}
              id="project-description"
            />
          </div>

          {/* Repo URL */}
          {sourceType === 'github' && (
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Repository URL
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="input-field pl-11"
                  placeholder="https://github.com/user/repo"
                  required
                  id="project-repo-url"
                />
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                Supports public GitHub repositories
              </p>
            </div>
          )}

          {/* Info card */}
          <div className="card" style={{
            background: 'rgba(99, 102, 241, 0.05)',
            border: '1px solid rgba(99, 102, 241, 0.15)',
          }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--brand-400)' }}>
              What happens next?
            </h4>
            <ol className="text-xs space-y-1" style={{ color: 'var(--text-tertiary)', paddingLeft: '1rem' }}>
              <li>Stack auto-detection (Node.js, Python, etc.)</li>
              <li>Dockerfile generation optimized for your stack</li>
              <li>Docker image build with security best practices</li>
              <li>Container deployment with resource limits</li>
              <li>Public URL assignment via reverse proxy</li>
            </ol>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-primary w-full"
            id="create-project-submit"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Project...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                Create Project
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
