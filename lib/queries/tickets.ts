/**
 * lib/queries/tickets.ts
 *
 * Server-side query builders for the reporting_tickets table.
 * ALL filtering, sorting, and pagination happens in SQL.
 * All user values are passed as prepared statement parameters.
 */
import { query, queryCount } from '@/lib/db/pool';
import type { TicketListQuery } from '@/lib/validation/tickets.schema';
import { ALLOWED_SORT_COLUMNS } from '@/lib/validation/tickets.schema';

// ─── Column list for list view (NO heavy JSON fields) ─────────────────────────
const LIST_COLUMNS = [
  'id',
  'ticket_id',
  'post_id',
  'claim_number',
  'claim_status',
  'ticket_status',
  'first_name',
  'last_name',
  'email',
  'airline',
  'flight_number',
  'scheduled_date',
  'departure_airport',
  'departure_airport_iata',
  'destination_airport',
  'destination_airport_iata',
  'compensation_amount',
  'amount_received',
  'need_payment_details',
  'need_resign',
  'dashboard_status',
  'is_dashboard_completed',
  'source',
  'assignee',
  'requester',
  'requested_date',
  'updated_at',
  'synced_at',
].join(', ');

// ─── Detail columns (full, including JSON) ─────────────────────────────────────
const DETAIL_COLUMNS = '*';

// ─── WHERE clause builder ──────────────────────────────────────────────────────
interface WhereResult {
  clause: string;
  params: unknown[];
}

function buildWhere(q: Partial<TicketListQuery>): WhereResult {
  const conditions: string[] = [];
  const params: unknown[] = [];

  // Global search — server-side LIKE across key fields
  if (q.search) {
    const like = `%${q.search}%`;
    conditions.push(`(
      claim_number LIKE ? OR
      ticket_id LIKE ? OR
      post_id LIKE ? OR
      first_name LIKE ? OR
      last_name LIKE ? OR
      email LIKE ? OR
      requester LIKE ? OR
      phone_number LIKE ? OR
      flight_number LIKE ? OR
      booking_reference_number LIKE ? OR
      airline LIKE ?
    )`);
    params.push(like, like, like, like, like, like, like, like, like, like, like);
  }

  // String exact/partial filters
  const stringFilters: Array<[keyof TicketListQuery, string]> = [
    ['claimNumber', 'claim_number'],
    ['ticketId', 'ticket_id'],
    ['postId', 'post_id'],
    ['firstName', 'first_name'],
    ['lastName', 'last_name'],
    ['email', 'email'],
    ['requester', 'requester'],
    ['assignee', 'assignee'],
    ['claimStatus', 'claim_status'],
    ['ticketStatus', 'ticket_status'],
    ['dashboardStatus', 'dashboard_status'],
    ['airline', 'airline'],
    ['flightNumber', 'flight_number'],
    ['departureCountry', 'departure_country'],
    ['destinationCountry', 'destination_country'],
    ['source', 'source'],
    ['eventType', 'event_type'],
    ['preferredLanguage', 'preferred_language'],
    ['originalClaimLanguage', 'original_claim_language'],
  ];

  for (const [key, col] of stringFilters) {
    const val = q[key] as string | undefined;
    if (val) {
      conditions.push(`${col} LIKE ?`);
      params.push(`%${val}%`);
    }
  }

  // Boolean filters
  const boolFilters: Array<[keyof TicketListQuery, string]> = [
    ['needPaymentDetails', 'need_payment_details'],
    ['needResign', 'need_resign'],
    ['dashboardCompleted', 'is_dashboard_completed'],
    ['whatsappNotification', 'whatsapp_notification'],
    ['multiplePassengers', 'multiple_passengers'],
    ['acceptanceDateMandatory', 'acceptance_date_mandatory'],
  ];

  for (const [key, col] of boolFilters) {
    const val = q[key] as boolean | undefined;
    if (val !== undefined) {
      conditions.push(`${col} = ?`);
      params.push(val ? 1 : 0);
    }
  }

  // Date range filters
  const dateRanges: Array<[string | undefined, string | undefined, string]> = [
    [q.requestedDateFrom, q.requestedDateTo, 'requested_date'],
    [q.solvedDateFrom, q.solvedDateTo, 'solved_date'],
    [q.scheduledDateFrom, q.scheduledDateTo, 'scheduled_date'],
    [q.claimAcceptanceDateFrom, q.claimAcceptanceDateTo, 'claim_acceptance_date'],
    [q.moneyReceivedDateFrom, q.moneyReceivedDateTo, 'money_received_date'],
  ];

  for (const [from, to, col] of dateRanges) {
    if (from) { conditions.push(`${col} >= ?`); params.push(from); }
    if (to)   { conditions.push(`${col} <= ?`); params.push(to + ' 23:59:59'); }
  }

  // Numeric range filters
  if (q.compensationMin !== undefined) {
    conditions.push('compensation_amount >= ?');
    params.push(q.compensationMin);
  }
  if (q.compensationMax !== undefined) {
    conditions.push('compensation_amount <= ?');
    params.push(q.compensationMax);
  }
  if (q.amountReceivedMin !== undefined) {
    conditions.push('amount_received >= ?');
    params.push(q.amountReceivedMin);
  }
  if (q.amountReceivedMax !== undefined) {
    conditions.push('amount_received <= ?');
    params.push(q.amountReceivedMax);
  }

  const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { clause, params };
}

// ─── Safe ORDER BY builder ─────────────────────────────────────────────────────
function buildOrderBy(sortBy?: string, sortDir?: string): string {
  // Validate against explicit whitelist — NEVER interpolate raw user input
  const col = ALLOWED_SORT_COLUMNS.includes(sortBy as typeof ALLOWED_SORT_COLUMNS[number])
    ? sortBy!
    : 'updated_at';
  const dir = sortDir === 'asc' ? 'ASC' : 'DESC';
  return `ORDER BY ${col} ${dir}`;
}

// ─── Public API ────────────────────────────────────────────────────────────────

export interface TicketRow {
  id: number;
  ticket_id: string;
  post_id: string;
  claim_number: string;
  claim_status: string;
  ticket_status: string;
  first_name: string;
  last_name: string;
  email: string;
  airline: string;
  flight_number: string;
  scheduled_date: string;
  departure_airport: string;
  departure_airport_iata: string;
  destination_airport: string;
  destination_airport_iata: string;
  compensation_amount: number | null;
  amount_received: number | null;
  need_payment_details: number;
  need_resign: number;
  dashboard_status: string;
  is_dashboard_completed: number;
  source: string;
  assignee: string;
  requester: string;
  requested_date: string;
  updated_at: string;
  synced_at: string;
}

export interface PaginatedTickets {
  data: TicketRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export async function getTickets(q: TicketListQuery): Promise<PaginatedTickets> {
  const { clause, params } = buildWhere(q);
  const orderBy = buildOrderBy(q.sortBy, q.sortDir);
  const offset = (q.page - 1) * q.pageSize;

  const countSql = `SELECT COUNT(*) as total FROM reporting_tickets ${clause}`;
  const dataSql = `
    SELECT ${LIST_COLUMNS}
    FROM reporting_tickets
    ${clause}
    ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const [total, data] = await Promise.all([
    queryCount(countSql, params),
    query<TicketRow>(dataSql, [...params, q.pageSize, offset]),
  ]);

  return {
    data,
    pagination: {
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages: Math.ceil(total / q.pageSize),
    },
  };
}

export async function getTicketById(id: number): Promise<Record<string, unknown> | null> {
  const rows = await query<Record<string, unknown>>(
    `SELECT ${DETAIL_COLUMNS} FROM reporting_tickets WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

/**
 * Returns rows for export (batched by cursor for large datasets).
 * Does NOT include heavy JSON unless explicitly requested.
 */
export async function getTicketsForExport(
  q: Partial<TicketListQuery>,
  includeAdvanced: boolean,
  selectedIds?: number[],
): Promise<AsyncGenerator<Record<string, unknown>[]>> {
  const BATCH_SIZE = 500;

  const exportColumns = includeAdvanced
    ? DETAIL_COLUMNS
    : [
        'claim_number', 'claim_status', 'first_name', 'last_name', 'email',
        'phone_number', 'airline', 'flight_number', 'scheduled_date',
        'departure_airport', 'destination_airport', 'compensation_amount',
        'amount_received', 'dashboard_status', 'need_payment_details',
        'need_resign', 'source', 'ticket_status', 'assignee', 'updated_at',
      ].join(', ');

  const { clause, params } = buildWhere(q);

  let whereClause = clause;
  const queryParams = [...params];

  if (selectedIds && selectedIds.length > 0) {
    const placeholders = selectedIds.map(() => '?').join(', ');
    const idCondition = `id IN (${placeholders})`;
    whereClause = whereClause
      ? `${whereClause} AND ${idCondition}`
      : `WHERE ${idCondition}`;
    queryParams.push(...selectedIds);
  }

  async function* batchGenerator(): AsyncGenerator<Record<string, unknown>[]> {
    let offset = 0;
    while (true) {
      const sql = `
        SELECT ${exportColumns}
        FROM reporting_tickets
        ${whereClause}
        ORDER BY id ASC
        LIMIT ? OFFSET ?
      `;
      const batch = await query<Record<string, unknown>>(sql, [...queryParams, BATCH_SIZE, offset]);
      if (batch.length === 0) break;
      yield batch;
      if (batch.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;
    }
  }

  return batchGenerator();
}
