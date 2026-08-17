/**
 * scripts/export-part-child.js
 *
 * Node.js CommonJS Child Process for a Single XLSX Part (25,000 rows max).
 * Executes directly via Node.js runtime (/opt/plesk/node/21/bin/node).
 *
 * OS MEMORY RECLAMATION:
 * Exiting with process.exit(0) guarantees 100% reclamation of all zlib, C++ ArrayBuffers,
 * and MySQL connection buffers.
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const mysql = require('mysql2/promise');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const PAYMENT_TEAM_COLUMNS = [
  { id: 'ticket_id', label: 'Ticket Id', dbCol: 'ticket_id' },
  { id: 'requested_date', label: 'Requested Date', dbCol: 'requested_date' },
  { id: 'ticket_status', label: 'Ticket Status', dbCol: 'ticket_status' },
  { id: 'claim_status', label: 'Claim Status', dbCol: 'claim_status' },
  { id: 'claim_number', label: 'Claim Number', dbCol: 'claim_number' },
  { id: 'first_name', label: 'First Name', dbCol: 'first_name' },
  { id: 'last_name', label: 'Last Name', dbCol: 'last_name' },
  { id: 'email', label: 'Email', dbCol: 'email' },
  { id: 'airline', label: 'Airline', dbCol: 'airline' },
  { id: 'flight_number', label: 'Flight Number', dbCol: 'flight_number' },
  { id: 'scheduled_date', label: 'Scheduled Date', dbCol: 'scheduled_date' },
  { id: 'compensation_amount', label: 'Compensation Amount', dbCol: 'compensation_amount' },
  { id: 'amount_received', label: 'Amount Received', dbCol: 'amount_received' },
  { id: 'need_payment_details', label: 'Need Payment Details', dbCol: 'need_payment_details' },
  { id: 'need_resign', label: 'Need Re-Sign', dbCol: 'need_resign' },
  { id: 'dashboard_status', label: 'Dashboard Status', dbCol: 'dashboard_status' },
  { id: 'source', label: 'Source', dbCol: 'source' },
  { id: 'assignee', label: 'Assignee', dbCol: 'assignee' },

  { id: 'first_jurisdiction', label: '1st Jurisdiction', dbCol: 'first_jurisdiction' },
  { id: 'second_jurisdiction', label: '2nd Jurisdiction', dbCol: 'second_jurisdiction' },
  { id: 'address', label: 'Address', dbCol: 'address' },
  { id: 'airline_country', label: 'Airline Country', dbCol: 'airline_country' },
  { id: 'airline_rejection_reason', label: 'Airline Rejection Reason', dbCol: 'airline_rejection_reason' },
  { id: 'assignment_form', label: 'Assignment Form', dbCol: 'assignment_form' },
  { id: 'boarding_pass', label: 'Boarding Pass Or E-Ticket', dbCol: 'boarding_pass' },
  { id: 'passport', label: 'Passport', dbCol: 'passport' },
  { id: 'signature', label: 'Signature', dbCol: 'signature' },
  { id: 'booking_reference_number', label: 'Booking Reference Number', dbCol: 'booking_reference_number' },
  { id: 'call_status', label: 'Call Status', dbCol: 'call_status' },
  { id: 'claim_acceptance_date', label: 'Claim Acceptance Date', dbCol: 'claim_acceptance_date' },
  { id: 'closure_reason', label: 'Closure Reason', dbCol: 'closure_reason' },
  { id: 'departure_airport_iata', label: 'Departure Airport Iata', dbCol: 'departure_airport_iata' },
  { id: 'departure_country', label: 'Departure Country', dbCol: 'departure_country' },
  { id: 'destination_airport_iata', label: 'Destination Airport Iata', dbCol: 'destination_airport_iata' },
  { id: 'destination_country', label: 'Destination Country', dbCol: 'destination_country' },
  { id: 'disruption', label: 'Disruption', dbCol: 'disruption' },
  { id: 'external_id', label: 'External Id', dbCol: 'external_id' },
  { id: 'fbclid', label: 'Fbclid', dbCol: 'fbclid' },
  { id: 'gclid', label: 'Gclid', dbCol: 'gclid' },
  { id: 'is_dashboard_completed', label: 'Is Dashboard Completed', dbCol: 'is_dashboard_completed' },
  { id: 'latest_update', label: 'Latest Update', dbCol: 'latest_update' },
  { id: 'latest_update_by_requester', label: 'Latest Update By Requester', dbCol: 'latest_update_by_requester' },
  { id: 'legal_fee_to_be_charged', label: 'Legal Fee To Be Charged', dbCol: 'legal_fee_to_be_charged' },
  { id: 'linked_data', label: 'Linked Data', dbCol: 'linked_data' },
  { id: 'missing_documents', label: 'Missing Documents', dbCol: 'missing_documents' },
  { id: 'money_received_date', label: 'Money Received Date', dbCol: 'money_received_date' },
  { id: 'original_claim_language', label: 'Original Claim Language', dbCol: 'original_claim_language' },
  { id: 'payment_info', label: 'Payment Info', dbCol: 'payment_info' },
  { id: 'phone_number', label: 'Phone Number', dbCol: 'phone_number' },
  { id: 'preferred_language', label: 'Preferred Language', dbCol: 'preferred_language' },
  { id: 'problem_reason', label: 'Problem Reason', dbCol: 'problem_reason' },
  { id: 'refly_rejection_reasons', label: 'Refly Rejection Reasons', dbCol: 'refly_rejection_reasons' },
  { id: 'requester', label: 'Requester', dbCol: 'requester' },
  { id: 'scheduled_date', label: 'Scheduled Date', dbCol: 'scheduled_date' },
  { id: 'solved_date', label: 'Solved Date', dbCol: 'solved_date' },
  { id: 'step_link', label: 'Step Link', dbCol: 'step_link' },
  { id: 'submitted_lawyer_statuses', label: 'Submitted Lawyer Statuses', dbCol: 'submitted_lawyer_statuses' },
  { id: 'tags', label: 'Tags', dbCol: 'NULL AS tags' },
  { id: 'total_passengers_number', label: 'Total Passengers Number', dbCol: 'total_passengers_number' },
  { id: 'utm', label: 'UTM', dbCol: "CONCAT_WS(' / ', NULLIF(utm_source,''), NULLIF(utm_medium,''), NULLIF(utm_campaign,''), NULLIF(utm_content,''), NULLIF(utm_id,''))" },
  { id: 'where_did_you_hear_about_refly', label: 'Where Did You Hear About Refly', dbCol: 'where_did_you_hear_about_refly' },
  { id: 'complete_route', label: 'Complete Route', dbCol: 'complete_route' },
];

async function runChildProcess() {
  const startTime = Date.now();
  const inputArg = process.argv[2];
  if (!inputArg) {
    console.error(JSON.stringify({ success: false, error: 'Missing JSON configuration argument' }));
    process.exit(1);
  }

  const args = JSON.parse(inputArg);
  const { jobId, partIndex, startId, rowLimit, outputPath, filters } = args;

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

  const filterConditions = [];
  const filterParams = [];

  const search = (filters.search) || '';
  if (search) {
    const like = `%${search}%`;
    filterConditions.push(`(claim_number LIKE ? OR ticket_id LIKE ? OR external_id LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR airline LIKE ? OR flight_number LIKE ? OR booking_reference_number LIKE ?)`);
    filterParams.push(like, like, like, like, like, like, like, like, like);
  }

  const stringFilters = [
    [filters.claimNumber || filters.claim_number, 'claim_number'],
    [filters.claimStatus || filters.claim_status, 'claim_status'],
    [filters.ticketStatus || filters.ticket_status, 'ticket_status'],
    [filters.dashboardStatus || filters.dashboard_status, 'dashboard_status'],
    [filters.airline, 'airline'],
    [filters.source, 'source'],
    [filters.assignee, 'assignee'],
    [filters.departureCountry || filters.departure_country, 'departure_country'],
    [filters.destinationCountry || filters.destination_country, 'destination_country'],
  ];

  for (const [val, col] of stringFilters) {
    if (val) { filterConditions.push(`${col} LIKE ?`); filterParams.push(`%${val}%`); }
  }

  const boolFilters = [
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
  let firstReturnedId = null;

  while (rowsProcessedInPart < rowLimit) {
    const fetchLimit = Math.min(BATCH, rowLimit - rowsProcessedInPart);

    // Positional mapping: [currentLastId, ...filterParams, fetchLimit]
    const queryParams = [currentLastId, ...filterParams, fetchLimit];

    const [dbRows] = await conn.execute(sqlQuery, queryParams);
    if (!dbRows || dbRows.length === 0) break;

    if (firstReturnedId === null) {
      firstReturnedId = Number(dbRows[0].id);
    }

    for (const r of dbRows) {
      currentLastId = Number(r.id);
      const rowObj = {};
      for (const col of PAYMENT_TEAM_COLUMNS) {
        rowObj[col.id] = r[col.id] ?? '';
      }
      const addedRow = worksheet.addRow(rowObj);
      addedRow.commit();
      rowsProcessedInPart++;
    }

    try { worksheet._rows = []; } catch (e) { /* ignore */ }
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
