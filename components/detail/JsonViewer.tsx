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
      <div className="text-xs font-mono text-zinc-400">
        <span>{label}: </span>
        <span>—</span>
      </div>
    );
  }

  const parsed = tryParse(value);
  const formatted = JSON.stringify(parsed, null, 2);

  return (
    <div className="border border-zinc-200 rounded-md overflow-hidden bg-white">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left font-mono select-none"
      >
        <span className="text-xs font-semibold text-zinc-800">{label}</span>
        <div className="flex items-center gap-1.5 text-zinc-400">
          <span className="text-[10px] text-zinc-500">{expanded ? 'Hide JSON' : 'Show JSON'}</span>
          <svg
            className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {expanded && (
        <pre className="text-[11px] font-mono text-zinc-900 bg-zinc-950 text-zinc-100 p-3 overflow-x-auto max-h-80 overflow-y-auto leading-relaxed">
          {formatted}
        </pre>
      )}
    </div>
  );
}
