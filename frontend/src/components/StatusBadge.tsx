'use client';

/**
 * Status badge component for projects and deployments.
 */

import { CheckCircle, Clock, Loader2, XCircle, StopCircle, Rocket, AlertTriangle } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { className: string; icon: React.ElementType; label: string }> = {
  created: { className: 'badge-neutral', icon: Clock, label: 'Created' },
  pending: { className: 'badge-info', icon: Clock, label: 'Pending' },
  cloning: { className: 'badge-info', icon: Loader2, label: 'Cloning' },
  building: { className: 'badge-warning', icon: Loader2, label: 'Building' },
  running: { className: 'badge-info', icon: Loader2, label: 'Running' },
  deploying: { className: 'badge-warning', icon: Loader2, label: 'Deploying' },
  deployed: { className: 'badge-success', icon: CheckCircle, label: 'Deployed' },
  failed: { className: 'badge-error', icon: XCircle, label: 'Failed' },
  stopped: { className: 'badge-neutral', icon: StopCircle, label: 'Stopped' },
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.created;
  const Icon = config.icon;
  const isAnimated = ['cloning', 'building', 'running', 'deploying', 'pending'].includes(status);

  return (
    <span
      className={`badge ${config.className}`}
      style={size === 'sm' ? { padding: '2px 8px', fontSize: '11px' } : undefined}
    >
      <Icon
        className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${isAnimated ? 'animate-spin' : ''}`}
      />
      {config.label}
    </span>
  );
}
