/**
 * scripts/child-launcher.ts
 *
 * Child process launcher utility for running export part generation in an isolated OS process.
 */

import { spawn } from 'child_process';
import path from 'path';

export interface ChildLauncherResult {
  success: boolean;
  jobId: string;
  partIndex: number;
  startId: number;
  firstReturnedId?: number | null;
  rows: number;
  lastId: number;
  fileSize: number;
  durationMs: number;
  maxRss: number;
  error?: string;
}

export function childProcessFork(config: Record<string, unknown>): Promise<ChildLauncherResult> {
  return new Promise((resolve) => {
    // Prefer compiled CommonJS script if present, fallback to tsx/node launcher
    const jsScript = path.join(process.cwd(), 'scripts', 'export-part-child.js');
    const nodeExec = process.execPath; // Node.js executable path (/opt/plesk/node/21/bin/node)

    const child = spawn(nodeExec, [jsScript, JSON.stringify(config)], {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        try {
          // Parse last JSON line from child stdout
          const lines = stdoutData.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const parsed = JSON.parse(lastLine);
          resolve(parsed);
        } catch (err) {
          resolve({
            success: false,
            jobId: String(config.jobId),
            partIndex: Number(config.partIndex),
            startId: Number(config.startId),
            rows: 0,
            lastId: Number(config.startId),
            fileSize: 0,
            durationMs: 0,
            maxRss: 0,
            error: `Failed to parse child process output: ${stdoutData || stderrData}`,
          });
        }
      } else {
        resolve({
          success: false,
          jobId: String(config.jobId),
          partIndex: Number(config.partIndex),
          startId: Number(config.startId),
          rows: 0,
          lastId: Number(config.startId),
          fileSize: 0,
          durationMs: 0,
          maxRss: 0,
          error: `Child process exited with code ${code}: ${stderrData || stdoutData}`,
        });
      }
    });

    child.on('error', (err) => {
      resolve({
        success: false,
        jobId: String(config.jobId),
        partIndex: Number(config.partIndex),
        startId: Number(config.startId),
        rows: 0,
        lastId: Number(config.startId),
        fileSize: 0,
        durationMs: 0,
        maxRss: 0,
        error: err.message,
      });
    });
  });
}
