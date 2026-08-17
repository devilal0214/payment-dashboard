/**
 * lib/export/export-logger.ts
 *
 * Structured Server-Side Export Logging & Memory Monitoring System.
 * Logs exact export pipeline stages and RSS / Heap memory metrics to PM2 / console
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

export function logMemoryUsage(jobId: string, processedRows: number, totalRows: number): void {
  const mem = process.memoryUsage();
  const rss = Math.round(mem.rss / 1048576);
  const heapUsed = Math.round(mem.heapUsed / 1048576);
  const heapTotal = Math.round(mem.heapTotal / 1048576);
  const external = Math.round(mem.external / 1048576);
  const arrayBuffers = Math.round((mem.arrayBuffers || 0) / 1048576);

  console.log(
    `[EXPORT MEMORY ${jobId}] rows=${processedRows}/${totalRows} rss=${rss}MB heapUsed=${heapUsed}MB heapTotal=${heapTotal}MB ext=${external}MB ab=${arrayBuffers}MB`
  );
}
