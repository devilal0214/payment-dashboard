/**
 * scripts/export-worker.ts
 *
 * Dedicated Export Worker Daemon process.
 * Orchestrates multi-part 25,000-row export jobs using OS process isolation (child_process).
 *
 * Runs as a standalone PM2 background process (refly-payment-export-worker).
 */

import fs from 'fs';
import path from 'path';
import { childProcessFork } from './child-launcher';
import {
  ensureExportJobsTable,
  dbGetNextQueuedJob,
  dbUpdateJobProgress,
  dbCompleteJob,
  dbFailJob,
  type DbExportJob,
} from '../lib/db/export-jobs-db';
import { createZipArchive } from '../lib/export/zip-helper';
import { logExportEvent } from '../lib/export/export-logger';

const EXPORT_TMP_DIR = process.env.EXPORT_TMP_DIR || path.join(process.cwd(), 'tmp', 'exports');
const ROWS_PER_PART = 25000;

async function processJob(job: DbExportJob) {
  const jobId = job.job_id;
  const jobDir = path.join(EXPORT_TMP_DIR, `job-${jobId}`);
  fs.mkdirSync(jobDir, { recursive: true });

  logExportEvent({ jobId, stage: 'init', status: 'start', rows: job.total_rows });

  const filters = job.filters_json ? JSON.parse(job.filters_json) : {};
  const totalParts = Math.max(1, Math.ceil(job.total_rows / ROWS_PER_PART));

  const parts: string[] = [];
  let currentLastId = 0;
  let totalProcessed = 0;

  await dbUpdateJobProgress(jobId, 0, 0, 'xlsx', 'processing');

  for (let partIndex = 1; partIndex <= totalParts; partIndex++) {
    const partFilename = `part-${String(partIndex).padStart(3, '0')}.xlsx`;
    const partPath = path.join(jobDir, partFilename);

    const childConfig = {
      jobId,
      partIndex,
      startId: currentLastId,
      rowLimit: ROWS_PER_PART,
      outputPath: partPath,
      filters,
    };

    const childResult = await childProcessFork(childConfig);

    if (!childResult.success) {
      const err = childResult.error || `Child process for Part ${partIndex} failed`;
      logExportEvent({ jobId, stage: 'xlsx', status: 'failed', error: err });
      await dbFailJob(jobId, err, 'xlsx');
      return;
    }

    currentLastId = childResult.lastId;
    totalProcessed += childResult.rows;
    parts.push(partPath);

    logExportEvent({
      jobId,
      stage: 'xlsx',
      status: 'processing',
      rows: totalProcessed,
      details: { part: partIndex, totalParts, childRssMB: childResult.maxRss },
    });

    await dbUpdateJobProgress(jobId, totalProcessed, partIndex, 'xlsx', 'processing');

    if (childResult.rows === 0 || totalProcessed >= job.total_rows) break;
  }

  logExportEvent({ jobId, stage: 'xlsx', status: 'success', rows: totalProcessed });

  // ZIP Creation Stage
  await dbUpdateJobProgress(jobId, totalProcessed, totalParts, 'zip', 'processing');
  logExportEvent({ jobId, stage: 'zip', status: 'start' });

  const zipStart = Date.now();
  const zipFilePath = job.output_path || path.join(jobDir, `refly-payment-export-${jobId}.zip`);
  const output = fs.createWriteStream(zipFilePath);
  const archive = createZipArchive({ zlib: { level: 6 } });

  const zipPromise = new Promise<void>((resolve, reject) => {
    output.on('close', () => resolve());
    output.on('finish', () => resolve());
    output.on('error', (err) => reject(err));
    archive.on('error', (err) => reject(err));
  });

  for (const partPath of parts) {
    archive.file(partPath, { name: path.basename(partPath) });
  }

  archive.pipe(output);
  await archive.finalize();
  await zipPromise;

  // Clean up individual XLSX parts
  for (const partPath of parts) {
    try { fs.unlinkSync(partPath); } catch { /* ignore */ }
  }

  if (!fs.existsSync(zipFilePath)) {
    const err = 'Generated ZIP archive file missing on disk';
    await dbFailJob(jobId, err, 'zip');
    return;
  }

  const zipSize = fs.statSync(zipFilePath).size;
  if (zipSize === 0) {
    const err = 'Generated ZIP archive is empty (0 bytes)';
    await dbFailJob(jobId, err, 'zip');
    return;
  }

  logExportEvent({ jobId, stage: 'zip', status: 'success', durationMs: Date.now() - zipStart, sizeBytes: zipSize });

  await dbCompleteJob(jobId, totalProcessed, zipSize);
  logExportEvent({ jobId, stage: 'completed' as any, status: 'success', rows: totalProcessed, sizeBytes: zipSize });
}

async function workerLoop() {
  console.log('[ExportWorker Daemon] Worker started. Polling export_jobs table...');
  await ensureExportJobsTable();

  while (true) {
    try {
      const job = await dbGetNextQueuedJob();
      if (job) {
        console.log(`[ExportWorker Daemon] Claimed job ${job.job_id} (${job.total_rows} rows)`);
        await processJob(job);
      }
    } catch (err) {
      console.error('[ExportWorker Daemon] Error in main loop:', err);
    }
    // Sleep 2 seconds before checking next job
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

workerLoop().catch((err) => {
  console.error('[ExportWorker Daemon] Fatal crash:', err);
  process.exit(1);
});
