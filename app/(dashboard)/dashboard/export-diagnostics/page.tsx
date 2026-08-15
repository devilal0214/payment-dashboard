'use client';

import { useState } from 'react';
import type { ExportHealthStatus, ExportDiagnosticReport } from '@/lib/export/export-diagnostics';

export default function ExportDiagnosticsPage() {
  const [health, setHealth] = useState<ExportHealthStatus | null>(null);
  const [diag, setDiag] = useState<ExportDiagnosticReport | null>(null);
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [loadingDiag, setLoadingDiag] = useState(false);
  const [loadingTest, setLoadingTest] = useState(false);

  async function fetchHealth() {
    setLoadingHealth(true);
    try {
      const res = await fetch('/api/tickets/export/health');
      const json = await res.json();
      setHealth(json);
    } catch {
      setHealth(null);
    } finally {
      setLoadingHealth(false);
    }
  }

  async function fetchDiagnostic() {
    setLoadingDiag(true);
    try {
      const res = await fetch('/api/tickets/export/diagnostic');
      const json = await res.json();
      setDiag(json);
    } catch {
      setDiag(null);
    } finally {
      setLoadingDiag(false);
    }
  }

  async function run100RowTest() {
    setLoadingTest(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/tickets/export/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: 100 }),
      });
      const json = await res.json();
      setTestResult(json);
    } catch (err) {
      setTestResult({ status: 'failed', error: String(err) });
    } finally {
      setLoadingTest(false);
    }
  }

  function triggerTestDownload() {
    const link = document.createElement('a');
    link.href = '/api/tickets/export/test-download';
    link.download = 'refly-test-download.zip';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try { document.body.removeChild(link); } catch { /* ignore */ }
    }, 1000);
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-zinc-950">Export Pipeline Diagnostics & Test Console</h1>
        <p className="text-xs text-zinc-500 font-mono mt-1">
          Isolated end-to-end diagnostic suite for testing database, filesystem, XLSX stream, ZIP compression, and download layer.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={fetchHealth}
          disabled={loadingHealth}
          className="px-4 py-2 bg-zinc-900 text-white rounded text-xs font-mono font-bold hover:bg-zinc-800 disabled:opacity-50"
        >
          {loadingHealth ? 'Checking Health...' : '[Run Health Check]'}
        </button>

        <button
          onClick={fetchDiagnostic}
          disabled={loadingDiag}
          className="px-4 py-2 bg-blue-600 text-white rounded text-xs font-mono font-bold hover:bg-blue-700 disabled:opacity-50"
        >
          {loadingDiag ? 'Running Diagnostic...' : '[Run Detailed Diagnostic]'}
        </button>

        <button
          onClick={run100RowTest}
          disabled={loadingTest}
          className="px-4 py-2 bg-emerald-600 text-white rounded text-xs font-mono font-bold hover:bg-emerald-700 disabled:opacity-50"
        >
          {loadingTest ? 'Running 100-Row Test...' : '[Run 100-Row Export Test]'}
        </button>

        <button
          onClick={triggerTestDownload}
          className="px-4 py-2 bg-amber-600 text-white rounded text-xs font-mono font-bold hover:bg-amber-700"
        >
          [Test ZIP Download]
        </button>
      </div>

      {/* Health Status Matrix */}
      {health && (
        <div className="p-4 bg-white border border-zinc-200 rounded-lg space-y-3">
          <h2 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
            <span>High-Level Subsystem Health Check</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
              health.status === 'ok' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {health.status}
            </span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
            <div className="p-2 bg-zinc-50 border rounded text-center">
              <span className="block text-[10px] text-zinc-500">Database</span>
              <strong className={health.database === 'ok' ? 'text-emerald-600' : 'text-rose-600'}>
                {health.database === 'ok' ? '✅ OK' : '❌ ERROR'}
              </strong>
            </div>
            <div className="p-2 bg-zinc-50 border rounded text-center">
              <span className="block text-[10px] text-zinc-500">Filesystem</span>
              <strong className={health.filesystem === 'ok' ? 'text-emerald-600' : 'text-rose-600'}>
                {health.filesystem === 'ok' ? '✅ OK' : '❌ ERROR'}
              </strong>
            </div>
            <div className="p-2 bg-zinc-50 border rounded text-center">
              <span className="block text-[10px] text-zinc-500">XLSX Writer</span>
              <strong className={health.xlsx === 'ok' ? 'text-emerald-600' : 'text-rose-600'}>
                {health.xlsx === 'ok' ? '✅ OK' : '❌ ERROR'}
              </strong>
            </div>
            <div className="p-2 bg-zinc-50 border rounded text-center">
              <span className="block text-[10px] text-zinc-500">ZIP Archiver</span>
              <strong className={health.zip === 'ok' ? 'text-emerald-600' : 'text-rose-600'}>
                {health.zip === 'ok' ? '✅ OK' : '❌ ERROR'}
              </strong>
            </div>
            <div className="p-2 bg-zinc-50 border rounded text-center">
              <span className="block text-[10px] text-zinc-500">Stream Adapter</span>
              <strong className={health.streamAdapter === 'ok' ? 'text-emerald-600' : 'text-rose-600'}>
                {health.streamAdapter === 'ok' ? '✅ OK' : '❌ ERROR'}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Diagnostic Report */}
      {diag && (
        <div className="p-4 bg-white border border-zinc-200 rounded-lg space-y-3">
          <h2 className="text-sm font-bold text-zinc-950">Detailed Diagnostic Breakdown</h2>
          <pre className="p-3 bg-zinc-950 text-zinc-100 rounded text-[11px] font-mono overflow-x-auto max-h-96">
            {JSON.stringify(diag, null, 2)}
          </pre>
        </div>
      )}

      {/* 100-Row Test Results */}
      {testResult && (
        <div className="p-4 bg-white border border-zinc-200 rounded-lg space-y-3">
          <h2 className="text-sm font-bold text-zinc-950">100-Row Export Pipeline Test Result</h2>
          <pre className="p-3 bg-zinc-950 text-zinc-100 rounded text-[11px] font-mono overflow-x-auto max-h-96">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
