'use client';

/**
 * AI Strategic Blueprint Panel.
 * Displays specialized architectural insights and optimization vectors.
 */

import { useQuery } from '@tanstack/react-query';
import { aiAPI } from '@/lib/api';
import type { AIArchitectResponse } from '@/lib/types';
import { 
  Zap, 
  ShieldCheck, 
  TrendingUp, 
  Target, 
  Activity,
  ChevronRight,
  Info,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

interface AIBlueprintPanelProps {
  projectId: string;
}

export default function AIBlueprintPanel({ projectId }: AIBlueprintPanelProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-blueprint', projectId],
    queryFn: () => aiAPI.getBlueprint(projectId),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="card space-y-4">
        <div className="flex items-center gap-3">
          <div className="skeleton w-8 h-8 rounded-lg" />
          <div className="skeleton w-48 h-5" />
        </div>
        <div className="skeleton w-full h-24" />
        <div className="grid grid-cols-3 gap-4">
          <div className="skeleton h-20" />
          <div className="skeleton h-20" />
          <div className="skeleton h-20" />
        </div>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="card text-center py-10">
        <Activity className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Blueprint analysis temporarily unavailable.
        </p>
      </div>
    );
  }

  const blueprint: AIArchitectResponse = data.data;

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High': return 'var(--status-success)';
      case 'Medium': return 'var(--status-warning)';
      case 'Low': return 'var(--brand-400)';
      default: return 'var(--text-tertiary)';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'performance': return Zap;
      case 'security': return ShieldCheck;
      case 'scaling': return TrendingUp;
      default: return Target;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--bg-card), var(--bg-elevated))',
          border: '1px solid var(--border-default)',
        }}
      >
        {/* Glow effect */}
        <div 
          className="absolute -top-24 -right-24 w-48 h-48 blur-[100px] opacity-20"
          style={{ background: 'var(--brand-500)' }}
        />

        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center relative z-10">
          {/* Health Score Circle */}
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="48" cy="48" r="40"
                stroke="var(--bg-tertiary)"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="48" cy="48" r="40"
                stroke="var(--brand-500)"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * blueprint.score) / 100}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {blueprint.score}
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold opacity-50">Health</span>
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-amber)' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent-amber)' }}>
                AI Architect Blueprint
              </span>
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              {blueprint.archetype} Archetype
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {blueprint.blueprint_summary}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {blueprint.recommendations.map((rec, i) => {
          const Icon = getCategoryIcon(rec.category);
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="card hover:border-[var(--brand-400)] transition-colors group"
            >
              <div className="flex items-start justify-between mb-4">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--bg-tertiary)' }}
                >
                  <Icon className="w-5 h-5" style={{ color: 'var(--brand-400)' }} />
                </div>
                <span 
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border"
                  style={{ 
                    borderColor: getImpactColor(rec.impact),
                    color: getImpactColor(rec.impact),
                    background: `${getImpactColor(rec.impact)}1A`
                  }}
                >
                  {rec.impact} Impact
                </span>
              </div>
              
              <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                {rec.category}
              </h4>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                {rec.suggestion}
              </p>
              
              <div className="mt-4 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--brand-400)' }}>
                Implementation details <ChevronRight className="w-3 h-3" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Proactive Insights Card */}
      <div className="card" style={{ borderStyle: 'dashed', background: 'transparent' }}>
        <div className="flex items-start gap-4">
          <div className="mt-1">
            <Info className="w-4 h-4" style={{ color: 'var(--brand-400)' }} />
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Proactive Optimization
            </h4>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              Auto-Pilot AI is continuously monitoring your infrastructure patterns. 
              New blueprints are generated after each major codebase change or traffic milestone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
