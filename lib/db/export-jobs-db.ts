/**
 * lib/db/export-jobs-db.ts
 *
 * Persistent Database Storage for Export Jobs in zendesk_reporting.
 * Ensures job status, progress, and stage persist across process restarts.
 */

import { query, queryOne } from '@/lib/db/pool';

export interface DbExportJob {
  job_id: string;
  user_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  stage: string;
  format: 'xlsx' | 'csv';
  total_rows: number;
  processed_rows: number;
  current_part: number;
  total_parts: number;
  output_path: string | null;
  file_size_bytes: number | null;
  error_message: string | null;
  filters_json: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

let tableInitialized = false;

export async function ensureExportJobsTable(): Promise<void> {
  if (tableInitialized) return;
  const sql = `
    CREATE TABLE IF NOT EXISTS export_jobs (
      job_id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'queued',
      stage VARCHAR(30) NOT NULL DEFAULT 'init',
      format VARCHAR(10) NOT NULL DEFAULT 'xlsx',
      total_rows INT NOT NULL DEFAULT 0,
      processed_rows INT NOT NULL DEFAULT 0,
      current_part INT NOT NULL DEFAULT 0,
      total_parts INT NOT NULL DEFAULT 0,
      output_path VARCHAR(255) NULL,
      file_size_bytes BIGINT NULL,
      error_message TEXT NULL,
      filters_json TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME NULL,
      completed_at DATETIME NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status (status),
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  try {
    await query(sql);
    tableInitialized = true;
  } catch (err) {
    console.error('[ExportJobsDB] Table init warning:', err);
  }
}

export async function dbCreateJob(job: {
  jobId: string;
  userId: string;
  format: 'xlsx' | 'csv';
  totalRows: number;
  totalParts: number;
  zipFilePath: string;
  filtersJson: string;
}): Promise<DbExportJob> {
  await ensureExportJobsTable();
  const sql = `
    INSERT INTO export_jobs (
      job_id, user_id, status, stage, format, total_rows, processed_rows,
      current_part, total_parts, output_path, filters_json, created_at
    ) VALUES (?, ?, 'queued', 'init', ?, ?, 0, 0, ?, ?, ?, NOW())
  `;
  await query(sql, [
    job.jobId,
    job.userId,
    job.format,
    job.totalRows,
    job.totalParts,
    job.zipFilePath,
    job.filtersJson,
  ]);

  const created = await dbGetJob(job.jobId);
  if (!created) throw new Error(`Failed to create database export job record for ${job.jobId}`);
  return created;
}

export async function dbGetJob(jobId: string): Promise<DbExportJob | null> {
  await ensureExportJobsTable();
  return queryOne<DbExportJob>('SELECT * FROM export_jobs WHERE job_id = ? LIMIT 1', [jobId]);
}

export async function dbUpdateJobProgress(
  jobId: string,
  processedRows: number,
  currentPart: number,
  stage: string,
  status: 'processing' | 'queued' = 'processing'
): Promise<void> {
  const sql = `
    UPDATE export_jobs
    SET processed_rows = ?, current_part = ?, stage = ?, status = ?, started_at = COALESCE(started_at, NOW())
    WHERE job_id = ?
  `;
  await query(sql, [processedRows, currentPart, stage, status, jobId]);
}

export async function dbCompleteJob(
  jobId: string,
  totalProcessed: number,
  fileSizeBytes: number
): Promise<void> {
  const sql = `
    UPDATE export_jobs
    SET status = 'completed', stage = 'completed', processed_rows = ?, file_size_bytes = ?, completed_at = NOW()
    WHERE job_id = ?
  `;
  await query(sql, [totalProcessed, fileSizeBytes, jobId]);
}

export async function dbFailJob(jobId: string, errorMessage: string, stage = 'failed'): Promise<void> {
  const sql = `
    UPDATE export_jobs
    SET status = 'failed', stage = ?, error_message = ?, completed_at = NOW()
    WHERE job_id = ?
  `;
  await query(sql, [stage, errorMessage.slice(0, 1000), jobId]);
}

export async function dbGetNextQueuedJob(): Promise<DbExportJob | null> {
  await ensureExportJobsTable();
  return queryOne<DbExportJob>(
    "SELECT * FROM export_jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1"
  );
}
