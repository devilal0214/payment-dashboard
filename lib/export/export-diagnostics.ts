/**
 * lib/export/export-diagnostics.ts
 *
 * Isolated Diagnostic Suite for ReFly Payment Export Subsystems.
 * Executes non-destructive tests for DB, FS, XLSX, ZIP, and Stream adapters.
 */

import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { queryCount } from '@/lib/db/pool';
import { createZipArchive } from './zip-helper';

const EXPORT_TMP_DIR = process.env.EXPORT_TMP_DIR || path.join(process.cwd(), 'tmp', 'exports');

export interface ExportHealthStatus {
  status: 'ok' | 'degraded' | 'error';
  database: 'ok' | 'error';
  filesystem: 'ok' | 'error';
  xlsx: 'ok' | 'error';
  zip: 'ok' | 'error';
  streamAdapter: 'ok' | 'error';
  timestamp: string;
}

export interface ExportDiagnosticReport {
  status: 'ok' | 'error';
  timestamp: string;
  database: {
    connected: boolean;
    testQuerySuccess: boolean;
    rowCount?: number;
    error?: string;
  };
  storage: {
    exportDirectoryExists: boolean;
    exportDirectoryWritable: boolean;
    availableBytes?: number;
    error?: string;
  };
  xlsx: {
    created: boolean;
    pathExists: boolean;
    sizeBytes: number;
    error?: string;
  };
  zip: {
    created: boolean;
    pathExists: boolean;
    sizeBytes: number;
    readable: boolean;
    error?: string;
  };
  download: {
    fileReadable: boolean;
    sizeBytes: number;
    error?: string;
  };
}

export async function runExportHealthCheck(): Promise<ExportHealthStatus> {
  const health: ExportHealthStatus = {
    status: 'ok',
    database: 'ok',
    filesystem: 'ok',
    xlsx: 'ok',
    zip: 'ok',
    streamAdapter: 'ok',
    timestamp: new Date().toISOString(),
  };

  // 1. Test DB
  try {
    await queryCount('SELECT COUNT(*) as total FROM reporting_tickets LIMIT 1');
  } catch {
    health.database = 'error';
    health.status = 'error';
  }

  // 2. Test FS
  try {
    if (!fs.existsSync(/*turbopackIgnore: true*/ EXPORT_TMP_DIR)) {
      fs.mkdirSync(/*turbopackIgnore: true*/ EXPORT_TMP_DIR, { recursive: true });
    }
    const testFile = path.join(EXPORT_TMP_DIR, `.health_${Date.now()}`);
    fs.writeFileSync(testFile, 'health-check');
    fs.unlinkSync(testFile);
  } catch {
    health.filesystem = 'error';
    health.status = 'error';
  }

  // 3. Test XLSX
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Test');
    ws.addRow(['test']);
    await wb.xlsx.writeBuffer();
  } catch {
    health.xlsx = 'error';
    health.status = 'error';
  }

  // 4. Test ZIP using safe helper
  try {
    const archive = createZipArchive({ zlib: { level: 1 } });
    if (!archive) throw new Error('Archiver initialization failed');
  } catch {
    health.zip = 'error';
    health.status = 'error';
  }

  return health;
}

export async function runExportDiagnostic(): Promise<ExportDiagnosticReport> {
  const report: ExportDiagnosticReport = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: { connected: false, testQuerySuccess: false },
    storage: { exportDirectoryExists: false, exportDirectoryWritable: false },
    xlsx: { created: false, pathExists: false, sizeBytes: 0 },
    zip: { created: false, pathExists: false, sizeBytes: 0, readable: false },
    download: { fileReadable: false, sizeBytes: 0 },
  };

  const diagDir = path.join(EXPORT_TMP_DIR, `diag-${Date.now()}`);

  try {
    // 1. Database Check
    try {
      const rows = await queryCount('SELECT COUNT(*) as total FROM reporting_tickets LIMIT 1');
      report.database.connected = true;
      report.database.testQuerySuccess = true;
      report.database.rowCount = rows;
    } catch (err) {
      report.status = 'error';
      report.database.error = err instanceof Error ? err.message : 'Database query failed';
    }

    // 2. Storage Check
    try {
      if (!fs.existsSync(/*turbopackIgnore: true*/ EXPORT_TMP_DIR)) {
        fs.mkdirSync(/*turbopackIgnore: true*/ EXPORT_TMP_DIR, { recursive: true });
      }
      report.storage.exportDirectoryExists = true;

      fs.mkdirSync(diagDir, { recursive: true });
      const testFile = path.join(diagDir, 'write-test.tmp');
      fs.writeFileSync(testFile, 'test-content');
      fs.unlinkSync(testFile);
      report.storage.exportDirectoryWritable = true;

      if (typeof fs.statfsSync === 'function') {
        const stats = fs.statfsSync(/*turbopackIgnore: true*/ EXPORT_TMP_DIR);
        report.storage.availableBytes = stats.bavail * stats.bsize;
      }
    } catch (err) {
      report.status = 'error';
      report.storage.error = err instanceof Error ? err.message : 'Storage test failed';
    }

    // 3. XLSX Generation Check
    const xlsxPath = path.join(diagDir, 'test.xlsx');
    try {
      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        filename: xlsxPath,
        useSharedStrings: false,
      });
      const ws = workbook.addWorksheet('Diag');
      ws.addRow(['ID', 'Status', 'Date']);
      ws.addRow([1, 'Test', new Date().toISOString()]);
      await workbook.commit();

      report.xlsx.created = true;
      report.xlsx.pathExists = fs.existsSync(xlsxPath);
      report.xlsx.sizeBytes = fs.existsSync(xlsxPath) ? fs.statSync(xlsxPath).size : 0;
    } catch (err) {
      report.status = 'error';
      report.xlsx.error = err instanceof Error ? err.message : 'XLSX stream generation failed';
    }

    // 4. ZIP Archive Check using safe helper
    const zipPath = path.join(diagDir, 'test.zip');
    try {
      const output = fs.createWriteStream(zipPath);
      const archive = createZipArchive({ zlib: { level: 6 } });

      const zipPromise = new Promise<void>((resolve, reject) => {
        output.on('close', () => resolve());
        output.on('finish', () => resolve());
        output.on('error', (err: Error) => reject(err));
        archive.on('error', (err: Error) => reject(err));
      });

      if (report.xlsx.pathExists) {
        archive.file(xlsxPath, { name: 'test.xlsx' });
      }
      archive.pipe(output);
      await archive.finalize();
      await zipPromise;

      report.zip.created = true;
      report.zip.pathExists = fs.existsSync(zipPath);
      report.zip.sizeBytes = fs.existsSync(zipPath) ? fs.statSync(zipPath).size : 0;

      // Verify ZIP file is readable
      if (report.zip.pathExists && report.zip.sizeBytes > 0) {
        const handle = fs.openSync(zipPath, 'r');
        const buf = Buffer.alloc(4);
        fs.readSync(handle, buf, 0, 4, 0);
        fs.closeSync(handle);
        // ZIP PK header signature check: 0x50 0x4B 0x03 0x04
        report.zip.readable = buf[0] === 0x50 && buf[1] === 0x4b;
      }
    } catch (err) {
      report.status = 'error';
      report.zip.error = err instanceof Error ? err.message : 'ZIP generation failed';
    }

    // 5. Download Stream Readability Check
    try {
      if (report.zip.pathExists) {
        const stream = fs.createReadStream(zipPath);
        await new Promise<void>((resolve, reject) => {
          stream.on('readable', () => resolve());
          stream.on('error', (e: Error) => reject(e));
        });
        stream.destroy();
        report.download.fileReadable = true;
        report.download.sizeBytes = report.zip.sizeBytes;
      }
    } catch (err) {
      report.status = 'error';
      report.download.error = err instanceof Error ? err.message : 'File stream read failed';
    }

  } finally {
    // Clean up temporary diagnostic folder
    try {
      if (fs.existsSync(diagDir)) {
        fs.rmSync(diagDir, { recursive: true, force: true });
      }
    } catch { /* ignore */ }
  }

  return report;
}
