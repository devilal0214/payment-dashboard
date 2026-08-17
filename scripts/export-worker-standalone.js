/**
 * scripts/export-worker-standalone.js
 *
 * Standalone PM2 Daemon Worker for ReFly Payment Export System.
 * Run by PM2 as refly-payment-export-worker.
 *
 * Usage:
 *   /opt/plesk/node/21/bin/node scripts/export-worker-standalone.js
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const mysql = require('mysql2/promise');
const archiver = require('archiver');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const EXPORT_TMP_DIR = process.env.EXPORT_TMP_DIR || path.join(process.cwd(), 'tmp', 'exports');
const ROWS_PER_PART = 25000;

function createZipArchive(options = { zlib: { level: 6 } }) {
  const fn = typeof archiver === 'function' ? archiver : archiver.default;
  return fn('zip', options);
}

function getDbPool() {
  return mysql.createPool({
    host: process.env.REPORT_DB_HOST || '127.0.0.1',
    port: parseInt(process.env.REPORT_DB_PORT || '3306', 10),
    user: process.env.REPORT_DB_USER,
    password: process.env.REPORT_DB_PASS,
    database: process.env.REPORT_DB_NAME || 'zendesk_reporting',
    dateStrings: true,
    timezone: 'Z',
  });
}

async function ensureTable(pool) {
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
  await pool.query(sql);
}

function runChildPart(config) {
  return new Promise((resolve) => {
    const jsScript = path.join(__dirname, 'export-part-child.js');
    const child = spawn(process.execPath, [jsScript, JSON.stringify(config)], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      if (code === 0) {
        try {
          const lines = stdout.trim().split('\n');
          const parsed = JSON.parse(lines[lines.length - 1]);
          resolve(parsed);
        } catch (e) {
          resolve({ success: false, error: `Parse error: ${stdout}` });
        }
      } else {
        resolve({ success: false, error: `Exit ${code}: ${stderr || stdout}` });
      }
    });

    child.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

async function processJob(pool, job) {
  const jobId = job.job_id;
  const jobDir = path.join(EXPORT_TMP_DIR, `job-${jobId}`);
  fs.mkdirSync(jobDir, { recursive: true });

  console.log(`[EXPORT WORKER ${jobId}] Started processing ${job.total_rows} rows`);

  const filters = job.filters_json ? JSON.parse(job.filters_json) : {};
  const totalParts = Math.max(1, Math.ceil(job.total_rows / ROWS_PER_PART));

  await pool.query(
    "UPDATE export_jobs SET status = 'processing', stage = 'xlsx', started_at = NOW(), total_parts = ? WHERE job_id = ?",
    [totalParts, jobId]
  );

  const parts = [];
  let currentLastId = 0;
  let totalProcessed = 0;

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

    const res = await runChildPart(childConfig);

    if (!res.success) {
      const err = res.error || `Part ${partIndex} child process failed`;
      console.error(`[EXPORT WORKER ${jobId}] Part ${partIndex} failed: ${err}`);
      await pool.query(
        "UPDATE export_jobs SET status = 'failed', stage = 'xlsx', error_message = ?, completed_at = NOW() WHERE job_id = ?",
        [err.slice(0, 1000), jobId]
      );
      return;
    }

    currentLastId = res.lastId;
    totalProcessed += res.rows;
    parts.push(partPath);

    console.log(`[EXPORT PART ${partIndex}/${totalParts}] rows=${res.rows} cumulative=${totalProcessed} maxRss=${res.maxRss}MB duration=${res.durationMs}ms`);

    await pool.query(
      "UPDATE export_jobs SET processed_rows = ?, current_part = ? WHERE job_id = ?",
      [totalProcessed, partIndex, jobId]
    );

    if (res.rows === 0 || totalProcessed >= job.total_rows) break;
  }

  // ZIP Compression Stage
  await pool.query("UPDATE export_jobs SET stage = 'zip' WHERE job_id = ?", [jobId]);
  console.log(`[EXPORT WORKER ${jobId}] Creating ZIP archive from ${parts.length} parts...`);

  const zipStart = Date.now();
  const zipFilePath = job.output_path || path.join(jobDir, `refly-payment-export-${jobId}.zip`);
  const output = fs.createWriteStream(zipFilePath);
  const archive = createZipArchive({ zlib: { level: 6 } });

  const zipPromise = new Promise((resolve, reject) => {
    output.on('close', resolve);
    output.on('finish', resolve);
    output.on('error', reject);
    archive.on('error', reject);
  });

  for (const p of parts) {
    archive.file(p, { name: path.basename(p) });
  }

  archive.pipe(output);
  await archive.finalize();
  await zipPromise;

  // Clean up XLSX part files
  for (const p of parts) {
    try { fs.unlinkSync(p); } catch (e) { /* ignore */ }
  }

  if (!fs.existsSync(zipFilePath) || fs.statSync(zipFilePath).size === 0) {
    const err = 'Generated ZIP file is missing or empty';
    await pool.query(
      "UPDATE export_jobs SET status = 'failed', stage = 'zip', error_message = ?, completed_at = NOW() WHERE job_id = ?",
      [err, jobId]
    );
    return;
  }

  const zipSize = fs.statSync(zipFilePath).size;
  const duration = Date.now() - zipStart;
  console.log(`[EXPORT WORKER ${jobId}] ZIP finalized! size=${zipSize} bytes duration=${duration}ms`);

  await pool.query(
    "UPDATE export_jobs SET status = 'completed', stage = 'completed', processed_rows = ?, file_size_bytes = ?, completed_at = NOW() WHERE job_id = ?",
    [totalProcessed, zipSize, jobId]
  );
}

async function startWorker() {
  console.log('[EXPORT WORKER DAEMON] Starting persistent export worker loop...');
  const pool = getDbPool();
  await ensureTable(pool);

  while (true) {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM export_jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1"
      );
      if (rows && rows.length > 0) {
        await processJob(pool, rows[0]);
      }
    } catch (err) {
      console.error('[EXPORT WORKER DAEMON] Loop error:', err);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

startWorker().catch((err) => {
  console.error('[EXPORT WORKER DAEMON] Fatal crash:', err);
  process.exit(1);
});
