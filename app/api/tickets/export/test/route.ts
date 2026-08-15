import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as archiver from 'archiver';
import ExcelJS from 'exceljs';
import { requireAuth } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';
import { PAYMENT_TEAM_COLUMNS } from '@/lib/export/columns';

const EXPORT_TMP_DIR = process.env.EXPORT_TMP_DIR || path.join(process.cwd(), 'tmp', 'exports');

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const limitRows = typeof body.rows === 'number' && body.rows > 0 && body.rows <= 1000 ? body.rows : 100;

    const testDir = path.join(EXPORT_TMP_DIR, `test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    const selectCols = PAYMENT_TEAM_COLUMNS.map((c) => {
      if (c.dbCol.toUpperCase().includes(' AS ')) return c.dbCol;
      if (c.dbCol.includes('(') || c.dbCol.includes(' ')) return `${c.dbCol} AS \`${c.id}\``;
      return `\`${c.dbCol}\` AS \`${c.id}\``;
    }).join(', ');

    // 1. Query rows from DB
    const sql = `SELECT id, ${selectCols} FROM reporting_tickets ORDER BY id ASC LIMIT ?`;
    const dbStart = Date.now();
    const rows = await query<Record<string, unknown>>(sql, [limitRows]);
    const dbDuration = Date.now() - dbStart;

    // 2. Generate XLSX
    const xlsxStart = Date.now();
    const xlsxPath = path.join(testDir, 'test-part-001.xlsx');
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      filename: xlsxPath,
      useSharedStrings: false,
    });
    const worksheet = workbook.addWorksheet('Claims Test');

    worksheet.columns = PAYMENT_TEAM_COLUMNS.map((c) => ({
      header: c.label,
      key: c.id,
      width: 15,
    }));

    for (const row of rows) {
      const rowObj: Record<string, unknown> = {};
      for (const col of PAYMENT_TEAM_COLUMNS) {
        rowObj[col.id] = row[col.id] ?? '';
      }
      worksheet.addRow(rowObj).commit();
    }

    await workbook.commit();
    const xlsxDuration = Date.now() - xlsxStart;
    const xlsxBytes = fs.existsSync(xlsxPath) ? fs.statSync(xlsxPath).size : 0;

    // 3. Create ZIP archive
    const zipStart = Date.now();
    const zipPath = path.join(testDir, 'test-export.zip');
    const output = fs.createWriteStream(zipPath);
    const archive = (typeof archiver === 'function' ? archiver : (archiver as any).default)('zip', { zlib: { level: 6 } });

    const zipPromise = new Promise<void>((resolve, reject) => {
      output.on('close', () => resolve());
      output.on('finish', () => resolve());
      output.on('error', (err: Error) => reject(err));
      archive.on('error', (err: Error) => reject(err));
    });

    archive.file(xlsxPath, { name: 'test-part-001.xlsx' });
    archive.pipe(output);
    await archive.finalize();
    await zipPromise;
    const zipDuration = Date.now() - zipStart;

    const zipExists = fs.existsSync(zipPath);
    const zipBytes = zipExists ? fs.statSync(zipPath).size : 0;

    // 4. Verify ZIP readability
    let zipReadable = false;
    if (zipExists && zipBytes > 0) {
      const handle = fs.openSync(zipPath, 'r');
      const buf = Buffer.alloc(4);
      fs.readSync(handle, buf, 0, 4, 0);
      fs.closeSync(handle);
      zipReadable = buf[0] === 0x50 && buf[1] === 0x4b;
    }

    // Cleanup test folder
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch { /* ignore */ }

    const totalDuration = Date.now() - startTime;

    return NextResponse.json({
      status: 'success',
      rows: rows.length,
      xlsxBytes,
      zipBytes,
      zipReadable,
      durationMs: totalDuration,
      breakdownMs: {
        database: dbDuration,
        xlsx: xlsxDuration,
        zip: zipDuration,
      },
    });

  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[Export Test POST Error]:', err);
    return NextResponse.json(
      {
        status: 'failed',
        error: err instanceof Error ? err.message : 'Test export pipeline execution failed',
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
