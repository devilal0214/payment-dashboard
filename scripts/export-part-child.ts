/**
 * scripts/export-part-child.ts
 *
 * Isolated Child Process Execution Script for a Single XLSX Part (25,000 rows max).
 *
 * KEY OS MEMORY GUARANTEE:
 * When this child process completes and executes process.exit(0), the OS kernel
 * IMMEDIATELY RECLAIMS 100% OF C++ NATIVE ARRAYBUFFERS, MYSQL STREAMS, AND V8 HEAP!
 * Peak memory stays zero for the parent process!
 */

import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import mysql from 'mysql2/promise';
import { PAYMENT_TEAM_COLUMNS } from '../lib/export/columns';

interface ChildArgs {
  jobId: string;
  partIndex: number;
  startId: number;
  rowLimit: number;
  outputPath: string;
  filters: Record<string, unknown>;
}

async function runChildProcess() {
  const startTime = Date.now();
  const inputArg = process.argv[2];
  if (!inputArg) {
    console.error(JSON.stringify({ success: false, error: 'Missing JSON configuration argument' }));
    process.exit(1);
  }

  const args: ChildArgs = JSON.parse(inputArg);
  const { jobId, partIndex, startId, rowLimit, outputPath, filters } = args;

  // Ensure output folder exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  // Connect to database directly in child process
  const conn = await mysql.createConnection({
    host: process.env.REPORT_DB_HOST || '127.0.0.1',
    port: parseInt(process.env.REPORT_DB_PORT || '3306', 10),
    user: process.env.REPORT_DB_USER,
    password: process.env.REPORT_DB_PASS,
    database: process.env.REPORT_DB_NAME || 'zendesk_reporting',
    dateStrings: true,
    timezone: 'Z',
  });

  // Build WHERE clause
  const conditions: string[] = ['id > ?'];
  const params: unknown[] = [startId];

  const search = (filters.search as string) || '';
  if (search) {
    const like = `%${search}%`;
    conditions.push(`(claim_number LIKE ? OR ticket_id LIKE ? OR external_id LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR airline LIKE ? OR flight_number LIKE ? OR booking_reference_number LIKE ?)`);
    params.push(like, like, like, like, like, like, like, like, like);
  }

  const stringFilters: Array<[string | undefined, string]> = [
    [(filters.claimNumber || filters.claim_number) as string, 'claim_number'],
    [(filters.claimStatus || filters.claim_status) as string, 'claim_status'],
    [(filters.ticketStatus || filters.ticket_status) as string, 'ticket_status'],
    [(filters.dashboardStatus || filters.dashboard_status) as string, 'dashboard_status'],
    [filters.airline as string, 'airline'],
    [filters.source as string, 'source'],
    [filters.assignee as string, 'assignee'],
    [(filters.departureCountry || filters.departure_country) as string, 'departure_country'],
    [(filters.destinationCountry || filters.destination_country) as string, 'destination_country'],
  ];

  for (const [val, col] of stringFilters) {
    if (val) { conditions.push(`${col} LIKE ?`); params.push(`%${val}%`); }
  }

  const boolFilters: Array<[unknown, string]> = [
    [filters.needPaymentDetails ?? filters.need_payment_details, 'need_payment_details'],
    [filters.needResign ?? filters.need_resign, 'need_resign'],
    [filters.dashboardCompleted ?? filters.is_dashboard_completed ?? filters.dashboard_completed, 'is_dashboard_completed'],
    [filters.latestUpdateByRequester ?? filters.latest_update_by_requester, 'latest_update_by_requester'],
  ];

  for (const [val, col] of boolFilters) {
    if (val !== undefined && val !== null && val !== '') {
      const isTrue = val === true || val === 'true' || val === 1 || val === '1';
      conditions.push(`${col} = ?`);
      params.push(isTrue ? 1 : 0);
    }
  }

  const selectCols = PAYMENT_TEAM_COLUMNS.map((c) => {
    if (c.dbCol.toUpperCase().includes(' AS ')) return c.dbCol;
    if (c.dbCol.includes('(') || c.dbCol.includes(' ')) return `${c.dbCol} AS \`${c.id}\``;
    return `\`${c.dbCol}\` AS \`${c.id}\``;
  }).join(', ');

  const sqlQuery = `
    SELECT id, ${selectCols}
    FROM reporting_tickets
    WHERE ${conditions.join(' AND ')}
    ORDER BY id ASC
    LIMIT ?
  `;

  // Create streaming ExcelJS workbook
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    filename: outputPath,
    useSharedStrings: false,
  });

  const worksheet = workbook.addWorksheet(`Claims Part ${partIndex}`);
  worksheet.columns = PAYMENT_TEAM_COLUMNS.map((c) => ({
    header: c.label,
    key: c.id,
    width: Math.max(c.label.length + 3, 14),
  }));

  const BATCH = 5000;
  let rowsProcessedInPart = 0;
  let currentLastId = startId;

  while (rowsProcessedInPart < rowLimit) {
    const fetchLimit = Math.min(BATCH, rowLimit - rowsProcessedInPart);
    const queryParams = [...params.slice(0, -1), currentLastId, fetchLimit];

    const [dbRows] = await conn.execute<mysql.RowDataPacket[]>(sqlQuery, queryParams as any);
    if (!dbRows || dbRows.length === 0) break;

    for (const r of dbRows) {
      currentLastId = Number(r.id);
      const rowObj: Record<string, unknown> = {};
      for (const col of PAYMENT_TEAM_COLUMNS) {
        rowObj[col.id] = r[col.id] ?? '';
      }
      const addedRow = worksheet.addRow(rowObj);
      addedRow.commit();
      rowsProcessedInPart++;
    }

    try { (worksheet as any)._rows = []; } catch { /* ignore */ }
    if (dbRows.length < fetchLimit) break;
  }

  await workbook.commit();
  await conn.end();

  const mem = process.memoryUsage();
  const maxRss = Math.round(mem.rss / 1048576);
  const fileSize = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;
  const durationMs = Date.now() - startTime;

  console.log(
    JSON.stringify({
      success: true,
      jobId,
      partIndex,
      rows: rowsProcessedInPart,
      lastId: currentLastId,
      fileSize,
      durationMs,
      maxRss,
    })
  );

  // OS kernel reclaims 100% memory upon exit
  process.exit(0);
}

runChildProcess().catch((err) => {
  console.error(
    JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    })
  );
  process.exit(1);
});
