/**
 * scripts/export-part-child.ts
 *
 * Isolated Child Process Execution Script for a Single XLSX Part (25,000 rows max).
 * Snapshot Isolation with maxId boundary to guarantee processedRows == total_rows.
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
  maxId?: number;
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
  const { jobId, partIndex, startId, maxId, rowLimit, outputPath, filters } = args;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const dbHost = process.env.REPORT_DB_HOST || '127.0.0.1';
  const dbPort = parseInt(process.env.REPORT_DB_PORT || '3306', 10);
  const dbUser = process.env.REPORT_DB_USER;
  const dbPass = process.env.REPORT_DB_PASS;
  const dbName = process.env.REPORT_DB_NAME || 'zendesk_reporting';

  const conn = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPass,
    database: dbName,
    dateStrings: true,
    timezone: 'Z',
  });

  const filterConditions: string[] = [];
  const filterParams: unknown[] = [];

  if (maxId && maxId > 0) {
    filterConditions.push('id <= ?');
    filterParams.push(maxId);
  }

  const search = (filters.search as string) || '';
  if (search) {
    const like = `%${search}%`;
    filterConditions.push(`(claim_number LIKE ? OR ticket_id LIKE ? OR external_id LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR airline LIKE ? OR flight_number LIKE ? OR booking_reference_number LIKE ?)`);
    filterParams.push(like, like, like, like, like, like, like, like, like);
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
    if (val) { filterConditions.push(`${col} LIKE ?`); filterParams.push(`%${val}%`); }
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
      filterConditions.push(`${col} = ?`);
      filterParams.push(isTrue ? 1 : 0);
    }
  }

  const selectCols = PAYMENT_TEAM_COLUMNS.map((c) => {
    if (c.dbCol.toUpperCase().includes(' AS ')) return c.dbCol;
    if (c.dbCol.includes('(') || c.dbCol.includes(' ')) return `${c.dbCol} AS \`${c.id}\``;
    return `\`${c.dbCol}\` AS \`${c.id}\``;
  }).join(', ');

  const whereClause = filterConditions.length > 0
    ? `WHERE id > ? AND ${filterConditions.join(' AND ')}`
    : `WHERE id > ?`;

  const sqlQuery = `
    SELECT id, ${selectCols}
    FROM reporting_tickets
    ${whereClause}
    ORDER BY id ASC
    LIMIT ?
  `;

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
  let firstReturnedId: number | null = null;

  while (rowsProcessedInPart < rowLimit) {
    const fetchLimit = Math.min(BATCH, rowLimit - rowsProcessedInPart);

    // Positional parameter map: [currentLastId, ...filterParams, fetchLimit]
    const queryParams = [currentLastId, ...filterParams, fetchLimit];

    const [dbRows] = await conn.execute<mysql.RowDataPacket[]>(sqlQuery, queryParams as any);
    if (!dbRows || dbRows.length === 0) break;

    if (firstReturnedId === null) {
      firstReturnedId = Number(dbRows[0].id);
    }

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
      startId,
      maxId: maxId || null,
      firstReturnedId,
      lastId: currentLastId,
      rows: rowsProcessedInPart,
      fileSize,
      durationMs,
      maxRss,
      dbName,
      filterCount: filterConditions.length,
      childPid: process.pid,
    })
  );

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
