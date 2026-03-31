'use client';

/**
 * Real-time log viewer component.
 * Polls for new logs and auto-scrolls.
 */

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { deployAPI } from '@/lib/api';
import type { LogEntry } from '@/lib/types';
import { Terminal, RefreshCw, Download } from 'lucide-react';

interface LogViewerProps {
  deploymentId: string;
  isActive: boolean;
}

export default function LogViewer({ deploymentId, isActive }: LogViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['logs', deploymentId],
    queryFn: () => deployAPI.getLogs(deploymentId, 500),
    refetchInterval: isActive ? 3000 : false,
    enabled: !!deploymentId,
  });

  const logs: LogEntry[] = data?.data?.logs || [];

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
  };

  const downloadLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deployment-${deploymentId.slice(0, 8)}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelClass = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return 'log-error';
      case 'warning': return 'log-warning';
      case 'debug': return 'log-debug';
      default: return 'log-info';
    }
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Deployment Logs
          </span>
          {isActive && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--status-success)' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--status-success)' }} />
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {logs.length} entries
          </span>
          <button onClick={() => refetch()} className="p-1.5 rounded-lg cursor-pointer" style={{ color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)' }}>
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={downloadLogs} className="p-1.5 rounded-lg cursor-pointer" style={{ color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)' }}>
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Log content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="overflow-auto p-4"
        style={{
          height: '400px',
          background: 'var(--bg-primary)',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="skeleton w-8 h-8 rounded-full mx-auto mb-3" />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading logs...</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              No logs available yet
            </p>
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={log.id || index} className={`log-line ${getLevelClass(log.level)}`}>
              <span style={{ color: 'var(--text-tertiary)', marginRight: '8px' }}>
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span
                className="inline-block w-[60px] text-right mr-2"
                style={{ opacity: 0.7 }}
              >
                [{log.level.toUpperCase()}]
              </span>
              <span>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
