'use client';

import { useState } from 'react';

interface JsonViewerProps {
  label: string;
  value: unknown;
}

function tryParse(val: unknown): unknown {
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
}

export default function JsonViewer({ label, value }: JsonViewerProps) {
  const [expanded, setExpanded] = useState(false);

  if (value === null || value === undefined || value === '') {
    return (
      <div>
        <p className="text-xs font-mono text-text-muted">{label}</p>
        <p className="text-xs text-text-muted mt-1">—</p>
      </div>
    );
  }

  const parsed = tryParse(value);
  const formatted = JSON.stringify(parsed, null, 2);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface-3 hover:bg-surface-4 transition-colors text-left"
      >
        <span className="text-xs font-mono font-medium text-text-secondary">{label}</span>
        <svg
          className={`w-3.5 h-3.5 text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <pre className="text-xs font-mono text-text-secondary bg-surface-0 p-3 overflow-x-auto max-h-72 overflow-y-auto leading-relaxed">
          {formatted}
        </pre>
      )}
    </div>
  );
}
