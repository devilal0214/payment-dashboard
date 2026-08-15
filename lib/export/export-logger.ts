/**
 * lib/export/export-logger.ts
 *
 * Structured Server-Side Export Logging System.
 * Logs exact export pipeline stages and performance metrics to PM2 / console
 * without exposing customer PII, passwords, or raw credentials.
 */

export type ExportStage =
  | 'init'
  | 'db_query'
  | 'xlsx'
  | 'zip'
  | 'download'
  | 'cleanup';

export interface ExportLogEvent {
  jobId: string;
  stage: ExportStage;
  status: 'start' | 'processing' | 'success' | 'failed';
  durationMs?: number;
  rows?: number;
  sizeBytes?: number;
  error?: string;
  details?: Record<string, unknown>;
}

export function logExportEvent(event: ExportLogEvent): void {
  const timestamp = new Date().toISOString();
  const parts = [
    `[EXPORT ${event.jobId}]`,
    `time=${timestamp}`,
    `stage=${event.stage}`,
    `status=${event.status}`,
  ];

  if (event.durationMs !== undefined) parts.push(`duration=${event.durationMs}ms`);
  if (event.rows !== undefined) parts.push(`rows=${event.rows}`);
  if (event.sizeBytes !== undefined) parts.push(`size=${event.sizeBytes}b`);
  if (event.error) parts.push(`error="${event.error.replace(/"/g, "'")}"`);

  if (event.status === 'failed') {
    console.error(parts.join(' '));
  } else {
    console.log(parts.join(' '));
  }
}
