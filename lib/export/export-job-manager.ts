/**
 * lib/export/export-job-manager.ts
 *
 * Server-side Background Export Job Manager for 1.8M+ rows.
 * Includes granular stage tracking and structured server logging.
 *
 * KEY GUARANTEES:
 * 1. Keyset pagination (WHERE id > ? ORDER BY id ASC LIMIT 5000) — NO slow OFFSET.
 * 2. ExcelJS WorkbookWriter streaming — NO giant in-memory workbooks.
 * 3. 50,000 rows max per XLSX file (part-001.xlsx, part-002.xlsx, etc.).
 * 4. Automatic ZIP compression of all XLSX parts into a single downloadable ZIP archive.
 * 5. Dynamic conservative disk-space safety check before job initiation.
 * 6. Archiver stream completion verification before setting job status = 'completed'.
 * 7. Isolated export tmp directory outside source code (./tmp/exports/job-[id]).
 * 8. Automatic cleanup: sweeps jobs older than 60 minutes.
 */

import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { query, queryCount } from '@/lib/db/pool';
import type { TicketListQuery } from '@/lib/validation/tickets.schema';
import { logExportEvent, type ExportStage } from './export-logger';
import { createZipArchive } from './zip-helper';

import { PAYMENT_TEAM_COLUMNS, type ColumnSpec } from './columns';
export type { ColumnSpec };
export { PAYMENT_TEAM_COLUMNS };

// ─── Config & Paths ────────────────────────────────────────────────────────────
const EXPORT_TMP_DIR = process.env.EXPORT_TMP_DIR || path.join(process.cwd(), 'tmp', 'exports');
const ROWS_PER_XLSX_FILE = 50000;
const BATCH_SIZE = 5000; // Keyset fetch chunk size from MySQL

export interface ExportJobMeta {
  jobId: string;
  userId: string;
  format: 'xlsx' | 'csv';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  stage: ExportStage;
  processedRows: number;
  totalRows: number;
  progressPercent: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
  zipFilename?: string;
  zipFilePath?: string;
  fileSizeBytes?: number;
}

// Ensure export tmp dir exists
function ensureTmpDir() {
  if (!fs.existsSync(/*turbopackIgnore: true*/ EXPORT_TMP_DIR)) {
    fs.mkdirSync(/*turbopackIgnore: true*/ EXPORT_TMP_DIR, { recursive: true });
  }
}

// Conservatively estimate required disk space for an export
export function estimateRequiredDiskSpace(totalRows: number): number {
  const bytesPerRow = 650; // Conservative estimate per row in XLSX + ZIP
  const baseSafetyBuffer = 100_000_000; // 100 MB safety buffer
  return (totalRows * bytesPerRow) + baseSafetyBuffer;
}

// Check available disk space to prevent filling server disk
export function checkAvailableDiskSpace(requiredBytes = 200_000_000): { ok: boolean; freeBytes: number; requiredBytes: number } {
  ensureTmpDir();
  try {
    if (typeof fs.statfsSync === 'function') {
      const stats = fs.statfsSync(/*turbopackIgnore: true*/ EXPORT_TMP_DIR);
      const freeBytes = stats.bavail * stats.bsize;
      return { ok: freeBytes >= requiredBytes, freeBytes, requiredBytes };
    }
  } catch { /* skip if unsupported */ }
  return { ok: true, freeBytes: Number.MAX_SAFE_INTEGER, requiredBytes };
}

// In-memory job cache for ultra-fast polling
const jobCache = new Map<string, ExportJobMeta>();

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
  const totalRows = await queryCount(`SELECT COUNT(*) as total FROM reporting_tickets ${whereClause}`, params);
  logExportEvent({ jobId: 'init', stage: 'db_query', status: 'success', durationMs: Date.now() - dbStart, rows: totalRows });

  // Dynamic disk space pre-check based on record count
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

  const meta: ExportJobMeta = {
    jobId,
    userId,
    format,
    status: 'queued',
    stage: 'init',
    processedRows: 0,
    totalRows,
    progressPercent: 0,
    createdAt: new Date().toISOString(),
    zipFilename,
    zipFilePath,
  };

  jobCache.set(jobId, meta);
  fs.writeFileSync(path.join(jobDir, 'meta.json'), JSON.stringify(meta, null, 2));

  logExportEvent({ jobId, stage: 'init', status: 'success', rows: totalRows });

  // Run background worker asynchronously (fire & forget without blocking HTTP response)
  process.nextTick(() => {
    runExportWorker(jobId, jobDir, whereClause, params, format).catch((err) => {
      const errMsg = err instanceof Error ? err.message : 'Export background processing failed';
      logExportEvent({ jobId, stage: meta.stage || 'xlsx', status: 'failed', error: errMsg });
      const j = jobCache.get(jobId);
      if (j) {
        j.status = 'failed';
        j.error = errMsg;
        jobCache.set(jobId, j);
        try {
          fs.writeFileSync(path.join(jobDir, 'meta.json'), JSON.stringify(j, null, 2));
        } catch { /* ignore write err */ }
      }
    });
  });

  return meta;
}

export function getJobMeta(jobId: string, userId: string): ExportJobMeta | null {
  const cached = jobCache.get(jobId);
  if (cached && cached.userId === userId) return cached;

  const jobDir = path.join(EXPORT_TMP_DIR, `job-${jobId}`);
  const metaPath = path.join(jobDir, 'meta.json');
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as ExportJobMeta;
      if (meta.userId === userId) {
        jobCache.set(jobId, meta);
        return meta;
      }
    } catch {
      return null;
    }
  }
  return null;
}

// ─── Background Worker ────────────────────────────────────────────────────────

async function runExportWorker(
  jobId: string,
  jobDir: string,
  whereClause: string,
  whereParams: unknown[],
  format: 'xlsx' | 'csv',
) {
  const meta = jobCache.get(jobId);
  if (!meta) return;

  meta.status = 'processing';
  meta.stage = format === 'csv' ? 'xlsx' : 'xlsx';
  jobCache.set(jobId, meta);

  logExportEvent({ jobId, stage: 'xlsx', status: 'start' });

  // Build column select query
  const selectCols = PAYMENT_TEAM_COLUMNS.map((c) => {
    if (c.dbCol.toUpperCase().includes(' AS ')) {
      return c.dbCol;
    }
    if (c.dbCol.includes('(') || c.dbCol.includes(' ')) {
      return `${c.dbCol} AS \`${c.id}\``;
    }
    return `\`${c.dbCol}\` AS \`${c.id}\``;
  }).join(', ');

  let lastSeenId = 0;
  let totalProcessed = 0;
  const parts: string[] = [];
  const xlsxStart = Date.now();

  if (format === 'csv') {
    // Single streaming CSV output
    const csvPath = meta.zipFilePath!;
    const writeStream = fs.createWriteStream(csvPath, { encoding: 'utf8' });

    // Write CSV header
    writeStream.write(PAYMENT_TEAM_COLUMNS.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',') + '\n');

    while (true) {
      const keysetWhere = whereClause
        ? `${whereClause} AND id > ${lastSeenId}`
        : `WHERE id > ${lastSeenId}`;

      const sql = `
        SELECT id, ${selectCols}
        FROM reporting_tickets
        ${keysetWhere}
        ORDER BY id ASC
        LIMIT ${BATCH_SIZE}
      `;

      const rows = await query<Record<string, unknown>>(sql, whereParams);
      if (rows.length === 0) break;

      for (const row of rows) {
        lastSeenId = Number(row.id);
        const line = PAYMENT_TEAM_COLUMNS.map((col) => {
          const val = row[col.id];
          if (val === null || val === undefined) return '""';
          const strVal = String(val).replace(/"/g, '""');
          return `"${strVal}"`;
        }).join(',') + '\n';
        writeStream.write(line);
      }

      totalProcessed += rows.length;
      meta.processedRows = totalProcessed;
      meta.progressPercent = meta.totalRows > 0 ? Math.min(Math.round((totalProcessed / meta.totalRows) * 100), 99) : 50;
      jobCache.set(jobId, meta);

      if (rows.length < BATCH_SIZE) break;
    }

    await new Promise<void>((resolve, reject) => {
      writeStream.end((err?: Error | null) => {
        if (err) reject(err); else resolve();
      });
    });

  } else {
    // Multi-part XLSX export (50,000 rows max per file)
    let currentPartIndex = 1;

    while (true) {
      const partFilename = `part-${String(currentPartIndex).padStart(3, '0')}.xlsx`;
      const partPath = path.join(jobDir, partFilename);

      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        filename: partPath,
        useSharedStrings: false,
      });

      const worksheet = workbook.addWorksheet(`Claims Part ${currentPartIndex}`);

      worksheet.columns = PAYMENT_TEAM_COLUMNS.map((c) => ({
        header: c.label,
        key: c.id,
        width: Math.max(c.label.length + 3, 14),
      }));

      let rowsInCurrentFile = 0;

      while (rowsInCurrentFile < ROWS_PER_XLSX_FILE) {
        const keysetWhere = whereClause
          ? `${whereClause} AND id > ${lastSeenId}`
          : `WHERE id > ${lastSeenId}`;

        const limit = Math.min(BATCH_SIZE, ROWS_PER_XLSX_FILE - rowsInCurrentFile);

        const sql = `
          SELECT id, ${selectCols}
          FROM reporting_tickets
          ${keysetWhere}
          ORDER BY id ASC
          LIMIT ${limit}
        `;

        const rows = await query<Record<string, unknown>>(sql, whereParams);
        if (rows.length === 0) break;

        for (const row of rows) {
          lastSeenId = Number(row.id);
          const rowObj: Record<string, unknown> = {};
          for (const col of PAYMENT_TEAM_COLUMNS) {
            rowObj[col.id] = row[col.id] ?? '';
          }
          worksheet.addRow(rowObj).commit();
          rowsInCurrentFile++;
          totalProcessed++;
        }

        meta.processedRows = totalProcessed;
        meta.progressPercent = meta.totalRows > 0 ? Math.min(Math.round((totalProcessed / meta.totalRows) * 90), 90) : 50;
        jobCache.set(jobId, meta);

        if (rows.length < limit) break;
      }

      await workbook.commit();
      parts.push(partPath);

      if (rowsInCurrentFile === 0 || totalProcessed >= meta.totalRows) break;
      currentPartIndex++;
    }

    logExportEvent({ jobId, stage: 'xlsx', status: 'success', durationMs: Date.now() - xlsxStart, rows: totalProcessed });

    // Compress all XLSX parts into ZIP file using archiver
    meta.stage = 'zip';
    jobCache.set(jobId, meta);
    logExportEvent({ jobId, stage: 'zip', status: 'start' });

    const zipStart = Date.now();
    const output = fs.createWriteStream(meta.zipFilePath!);
    const archive = createZipArchive({ zlib: { level: 6 } });

    const archivePromise = new Promise<void>((resolve, reject) => {
      output.on('close', () => resolve());
      output.on('finish', () => resolve());
      output.on('error', (err: Error) => reject(err));
      archive.on('error', (err: Error) => reject(err));
    });

    for (const partPath of parts) {
      archive.file(partPath, { name: path.basename(partPath) });
    }

    archive.pipe(output);
    await archive.finalize();
    await archivePromise;

    // Delete temporary part XLSX files after ZIP is finalized
    for (const partPath of parts) {
      try { fs.unlinkSync(partPath); } catch { /* ignore */ }
    }

    logExportEvent({ jobId, stage: 'zip', status: 'success', durationMs: Date.now() - zipStart });
  }

  // Verify file exists and has non-zero size before marking completed
  if (!fs.existsSync(meta.zipFilePath!)) {
    throw new Error('Export file generation failed (file missing).');
  }

  const stats = fs.statSync(meta.zipFilePath!);
  if (stats.size === 0) {
    throw new Error('Generated export file is empty (0 bytes).');
  }

  // Complete job
  meta.status = 'completed';
  meta.stage = 'completed' as any;
  meta.processedRows = totalProcessed;
  meta.progressPercent = 100;
  meta.completedAt = new Date().toISOString();
  meta.fileSizeBytes = stats.size;
  jobCache.set(jobId, meta);

  fs.writeFileSync(path.join(jobDir, 'meta.json'), JSON.stringify(meta, null, 2));

  logExportEvent({ jobId, stage: 'completed' as any, status: 'success', sizeBytes: stats.size, rows: totalProcessed });

  // Trigger background cleanup sweep of old jobs (> 60 min old)
  cleanOldExportJobs();
}

// ─── Automatic Cleanup Safety Net ─────────────────────────────────────────────

export function cleanOldExportJobs() {
  ensureTmpDir();
  try {
    const entries = fs.readdirSync(/*turbopackIgnore: true*/ EXPORT_TMP_DIR);
    const now = Date.now();
    const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour retention

    for (const entry of entries) {
      if (!entry.startsWith('job-')) continue;
      const jobDir = path.join(/*turbopackIgnore: true*/ EXPORT_TMP_DIR, entry);
      try {
        const stats = fs.statSync(/*turbopackIgnore: true*/ jobDir);
        if (now - stats.mtimeMs > MAX_AGE_MS) {
          fs.rmSync(jobDir, { recursive: true, force: true });
          const jobId = entry.replace('job-', '');
          jobCache.delete(jobId);
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
}
