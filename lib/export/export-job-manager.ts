/**
 * lib/export/export-job-manager.ts
 *
 * Server-side Export Job Coordinator with MySQL DB Persistence (export_jobs table).
 * Enforces Snapshot Boundary (maxId) to ensure processedRows EXACTLY matches totalRows.
 */

import fs from 'fs';
import path from 'path';
import { queryOne } from '@/lib/db/pool';
import {
  dbCreateJob,
  dbGetJob,
  type DbExportJob,
} from '@/lib/db/export-jobs-db';
import type { TicketListQuery } from '@/lib/validation/tickets.schema';
import { logExportEvent, type ExportStage } from './export-logger';

import { PAYMENT_TEAM_COLUMNS, type ColumnSpec } from './columns';
export type { ColumnSpec };
export { PAYMENT_TEAM_COLUMNS };

const EXPORT_TMP_DIR = process.env.EXPORT_TMP_DIR || path.join(process.cwd(), 'tmp', 'exports');

export interface ExportJobMeta {
  jobId: string;
  userId: string;
  format: 'xlsx' | 'csv';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  stage: ExportStage;
  processedRows: number;
  totalRows: number;
  currentPart?: number;
  totalParts?: number;
  maxId?: number;
  progressPercent: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
  zipFilename?: string;
  zipFilePath?: string;
  fileSizeBytes?: number;
}

function ensureTmpDir() {
  if (!fs.existsSync(/*turbopackIgnore: true*/ EXPORT_TMP_DIR)) {
    fs.mkdirSync(/*turbopackIgnore: true*/ EXPORT_TMP_DIR, { recursive: true });
  }
}

export function estimateRequiredDiskSpace(totalRows: number): number {
  const bytesPerRow = 650;
  const baseSafetyBuffer = 100_000_000;
  return (totalRows * bytesPerRow) + baseSafetyBuffer;
}

export function checkAvailableDiskSpace(requiredBytes = 200_000_000): { ok: boolean; freeBytes: number; requiredBytes: number } {
  ensureTmpDir();
  try {
    if (typeof fs.statfsSync === 'function') {
      const stats = fs.statfsSync(/*turbopackIgnore: true*/ EXPORT_TMP_DIR);
      const freeBytes = stats.bavail * stats.bsize;
      return { ok: freeBytes >= requiredBytes, freeBytes, requiredBytes };
    }
  } catch { /* skip */ }
  return { ok: true, freeBytes: Number.MAX_SAFE_INTEGER, requiredBytes };
}

// ─── SQL WHERE clause builder ──────────────────────────────────────────────────
function buildWhere(q: Partial<TicketListQuery> & Record<string, unknown>, selectedIds?: number[]) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (selectedIds && selectedIds.length > 0) {
    const placeholders = selectedIds.map(() => '?').join(',');
    conditions.push(`id IN (${placeholders})`);
    params.push(...selectedIds);
  }

  const search = (q.search as string) || '';
  if (search) {
    const like = `%${search}%`;
    conditions.push(`(claim_number LIKE ? OR ticket_id LIKE ? OR external_id LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR airline LIKE ? OR flight_number LIKE ? OR booking_reference_number LIKE ?)`);
    params.push(like, like, like, like, like, like, like, like, like);
  }

  const stringFilters: Array<[string | undefined, string]> = [
    [(q.claimNumber || q.claim_number) as string, 'claim_number'],
    [(q.claimStatus || q.claim_status) as string, 'claim_status'],
    [(q.ticketStatus || q.ticket_status) as string, 'ticket_status'],
    [(q.dashboardStatus || q.dashboard_status) as string, 'dashboard_status'],
    [q.airline as string, 'airline'],
    [q.source as string, 'source'],
    [q.assignee as string, 'assignee'],
    [(q.departureCountry || q.departure_country) as string, 'departure_country'],
    [(q.destinationCountry || q.destination_country) as string, 'destination_country'],
  ];

  for (const [val, col] of stringFilters) {
    if (val) { conditions.push(`${col} LIKE ?`); params.push(`%${val}%`); }
  }

  const boolFilters: Array<[unknown, string]> = [
    [q.needPaymentDetails ?? q.need_payment_details, 'need_payment_details'],
    [q.needResign ?? q.need_resign, 'need_resign'],
    [q.dashboardCompleted ?? q.is_dashboard_completed ?? q.dashboard_completed, 'is_dashboard_completed'],
    [q.latestUpdateByRequester ?? q.latest_update_by_requester, 'latest_update_by_requester'],
  ];

  for (const [val, col] of boolFilters) {
    if (val !== undefined && val !== null && val !== '') {
      const isTrue = val === true || val === 'true' || val === 1 || val === '1';
      conditions.push(`${col} = ?`);
      params.push(isTrue ? 1 : 0);
    }
  }

  const dateRanges: Array<[string | undefined, string | undefined, string]> = [
    [q.requestedDateFrom as string, q.requestedDateTo as string, 'requested_date'],
    [q.scheduledDateFrom as string, q.scheduledDateTo as string, 'scheduled_date'],
  ];

  for (const [from, to, col] of dateRanges) {
    if (from) { conditions.push(`${col} >= ?`); params.push(from); }
    if (to)   { conditions.push(`${col} <= ?`); params.push(to + ' 23:59:59'); }
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function createExportJob(
  userId: string,
  queryParams: Record<string, unknown>,
  format: 'xlsx' | 'csv' = 'xlsx',
  selectedIds?: number[],
): Promise<ExportJobMeta> {
  ensureTmpDir();

  const { whereClause, params } = buildWhere(queryParams, selectedIds);

  const dbStart = Date.now();
  logExportEvent({ jobId: 'init', stage: 'db_query', status: 'start' });

  // Calculate totalRows and lock maxId boundary at job creation moment
  const countAndMax = await queryOne<{ total: string | number; max_id: string | number }>(
    `SELECT COUNT(*) as total, MAX(id) as max_id FROM reporting_tickets ${whereClause}`,
    params
  );
  const totalRows = Number(countAndMax?.total ?? 0);
  const maxId = Number(countAndMax?.max_id ?? 0);

  logExportEvent({ jobId: 'init', stage: 'db_query', status: 'success', durationMs: Date.now() - dbStart, rows: totalRows });

  // Dynamic disk space pre-check
  const requiredBytes = estimateRequiredDiskSpace(totalRows);
  const diskCheck = checkAvailableDiskSpace(requiredBytes);
  if (!diskCheck.ok) {
    const freeMB = Math.round(diskCheck.freeBytes / 1_048_576);
    const reqMB = Math.round(requiredBytes / 1_048_576);
    const err = `Insufficient server storage space to export ${totalRows.toLocaleString()} records (required: ~${reqMB}MB, available: ~${freeMB}MB). Please refine search criteria.`;
    logExportEvent({ jobId: 'init', stage: 'init', status: 'failed', error: err });
    throw new Error(err);
  }

  const jobId = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const jobDir = path.join(EXPORT_TMP_DIR, `job-${jobId}`);
  fs.mkdirSync(jobDir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const zipFilename = `refly-payment-export-${today}-${jobId}.${format === 'csv' ? 'csv' : 'zip'}`;
  const zipFilePath = path.join(jobDir, zipFilename);
  const totalParts = Math.max(1, Math.ceil(totalRows / 25000));

  const dbJob = await dbCreateJob({
    jobId,
    userId,
    format,
    totalRows,
    totalParts,
    maxId,
    zipFilePath,
    filtersJson: JSON.stringify(queryParams),
  });

  logExportEvent({ jobId, stage: 'init', status: 'success', rows: totalRows });

  return mapDbToMeta(dbJob, zipFilename);
}

export async function getJobMeta(jobId: string, userId: string): Promise<ExportJobMeta | null> {
  const dbJob = await dbGetJob(jobId);
  if (!dbJob || dbJob.user_id !== userId) return null;
  const today = new Date().toISOString().slice(0, 10);
  const zipFilename = `refly-payment-export-${today}-${jobId}.${dbJob.format === 'csv' ? 'csv' : 'zip'}`;
  return mapDbToMeta(dbJob, zipFilename);
}

function mapDbToMeta(dbJob: DbExportJob, zipFilename: string): ExportJobMeta {
  const progressPercent = dbJob.total_rows > 0
    ? Math.min(Math.round((dbJob.processed_rows / dbJob.total_rows) * 100), dbJob.status === 'completed' ? 100 : 99)
    : (dbJob.status === 'completed' ? 100 : 0);

  return {
    jobId: dbJob.job_id,
    userId: dbJob.user_id,
    format: dbJob.format,
    status: dbJob.status,
    stage: (dbJob.stage as ExportStage) || 'init',
    processedRows: dbJob.processed_rows,
    totalRows: dbJob.total_rows,
    currentPart: dbJob.current_part || 0,
    totalParts: dbJob.total_parts || 0,
    maxId: dbJob.max_id || undefined,
    progressPercent,
    error: dbJob.error_message || undefined,
    createdAt: dbJob.created_at,
    completedAt: dbJob.completed_at || undefined,
    zipFilename,
    zipFilePath: dbJob.output_path || undefined,
    fileSizeBytes: dbJob.file_size_bytes || undefined,
  };
}

// ─── Periodic Stale Job Cleanup ───────────────────────────────────────────────

export function cleanOldExportJobs() {
  ensureTmpDir();
  try {
    const entries = fs.readdirSync(/*turbopackIgnore: true*/ EXPORT_TMP_DIR);
    const now = Date.now();
    const MAX_AGE_MS = 60 * 60 * 1000; // 60 minutes TTL

    for (const entry of entries) {
      if (!entry.startsWith('job-')) continue;
      const jobDir = path.join(/*turbopackIgnore: true*/ EXPORT_TMP_DIR, entry);
      try {
        const stats = fs.statSync(/*turbopackIgnore: true*/ jobDir);
        if (now - stats.mtimeMs > MAX_AGE_MS) {
          logExportEvent({ jobId: entry.replace('job-', ''), stage: 'cleanup', status: 'start', error: 'stale_job_ttl' });
          fs.rmSync(jobDir, { recursive: true, force: true });
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
}
