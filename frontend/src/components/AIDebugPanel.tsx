'use client';

/**
 * AI Debug Panel component.
 * Triggers AI analysis on deployment logs and displays suggestions.
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { aiAPI } from '@/lib/api';
import type { AISuggestion, AIAnalyzeResponse } from '@/lib/types';
import {
  Bot,
  Brain,
  Lightbulb,
  Terminal,
  AlertTriangle,
  CheckCircle,
  Copy,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AIDebugPanelProps {
  deploymentId: string;
}

export default function AIDebugPanel({ deploymentId }: AIDebugPanelProps) {
  const [additionalContext, setAdditionalContext] = useState('');
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  // Fetch existing suggestions
  const { data: suggestionsData, refetch } = useQuery({
    queryKey: ['ai-suggestions', deploymentId],
    queryFn: () => aiAPI.getSuggestions(deploymentId),
    enabled: !!deploymentId,
  });

  const suggestions: AISuggestion[] = suggestionsData?.data || [];

  // Analyze mutation
  const analyzeMutation = useMutation({
    mutationFn: () => aiAPI.analyze(deploymentId, additionalContext || undefined),
    onSuccess: () => {
      refetch();
      setAdditionalContext('');
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(text);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const getConfidenceConfig = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return { color: 'var(--status-success)', label: 'High Confidence', icon: CheckCircle };
      case 'medium':
        return { color: 'var(--status-warning)', label: 'Medium Confidence', icon: AlertTriangle };
      case 'low':
        return { color: 'var(--status-error)', label: 'Low Confidence', icon: AlertTriangle };
      default:
        return { color: 'var(--text-tertiary)', label: 'Unknown', icon: AlertTriangle };
    }
  };

  return (
    <div className="space-y-4">
      {/* Analyze trigger */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(6, 182, 212, 0.2))',
            }}
          >
            <Brain className="w-4 h-4" style={{ color: 'var(--accent-violet)' }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              AI Error Analysis
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Analyze logs to identify issues and get fix suggestions
            </p>
          </div>
        </div>

        <textarea
          value={additionalContext}
          onChange={(e) => setAdditionalContext(e.target.value)}
          placeholder="Add additional context about the issue (optional)..."
          className="input-field mb-3"
          rows={3}
          style={{ resize: 'vertical' }}
        />

        <button
          onClick={() => analyzeMutation.mutate()}
          disabled={analyzeMutation.isPending}
          className="btn-primary w-full"
        >
          {analyzeMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing Logs...
            </>
          ) : (
            <>
              <Bot className="w-4 h-4" />
              Analyze with AI
            </>
          )}
        </button>

        {analyzeMutation.isError && (
          <p className="mt-2 text-xs" style={{ color: 'var(--status-error)' }}>
            Analysis failed: {(analyzeMutation.error as Error).message}
          </p>
        )}
      </div>

      {/* Suggestions list */}
      <AnimatePresence>
        {suggestions.map((suggestion, index) => {
          const confidence = getConfidenceConfig(suggestion.confidence);
          const ConfidenceIcon = confidence.icon;
          let commands: string[] = [];
          try {
            commands = JSON.parse(suggestion.commands || '[]');
          } catch {
            commands = [];
          }

          return (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              className="card"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" style={{ color: 'var(--accent-amber)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    AI Suggestion #{suggestions.length - index}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ConfidenceIcon className="w-3.5 h-3.5" style={{ color: confidence.color }} />
                  <span className="text-xs font-medium" style={{ color: confidence.color }}>
                    {confidence.label}
                  </span>
                </div>
              </div>

              {/* Root Cause */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--status-error)' }}>
                  Root Cause
                </h4>
                <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {suggestion.root_cause}
                </p>
              </div>

              {/* Fix Suggestion */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--status-success)' }}>
                  Suggested Fix
                </h4>
                <div
                  className="text-sm p-3 rounded-lg"
                  style={{
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-primary)',
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {suggestion.fix_suggestion}
                </div>
              </div>

              {/* Commands */}
              {commands.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--accent-cyan)' }}>
                    <Terminal className="w-3 h-3 inline mr-1" />
                    Suggested Commands
                  </h4>
                  <div className="space-y-2">
                    {commands.map((cmd, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-lg"
                        style={{
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <code
                          className="text-xs"
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            color: 'var(--accent-cyan)',
                          }}
                        >
                          $ {cmd}
                        </code>
                        <button
                          onClick={() => copyToClipboard(cmd)}
                          className="p-1 rounded cursor-pointer"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {copiedCommand === cmd ? (
                            <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--status-success)' }} />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {new Date(suggestion.created_at).toLocaleString()}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {suggestions.length === 0 && !analyzeMutation.isPending && (
        <div className="card text-center py-8">
          <Bot className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            No AI suggestions yet. Click &quot;Analyze with AI&quot; to get started.
          </p>
        </div>
      )}
    </div>
  );
}
