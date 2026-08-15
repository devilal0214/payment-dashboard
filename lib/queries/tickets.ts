/**
 * lib/queries/tickets.ts
 *
 * Server-side query builders for the reporting_tickets table.
 * ALL filtering, sorting, and pagination happens in SQL.
 * All user values are passed as prepared statement parameters.
 */
import { query, queryCount } from '@/lib/db/pool';
import type { TicketListQuery } from '@/lib/validation/tickets.schema';
import { SORT_COLUMN_MAP } from '@/lib/validation/tickets.schema';

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
  'phone_number',
  'address',
  'airline',
  'airline_country',
  'flight_number',
  'scheduled_date',
  'departure_airport',
  'departure_airport_iata',
  'departure_country',
  'destination_airport',
  'destination_airport_iata',
  'destination_country',
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
  'money_received_date',
  'claim_acceptance_date',
  'solved_date',
  'jurisdiction_1st',
  'jurisdiction_2nd',
  'booking_reference_number',
  'call_status',
  'closure_reason',
  'disruption',
  'legal_fee_to_be_charged',
  'total_passengers_number',
  'where_did_you_hear_about_refly',
  'complete_route',
  'dashboard_link',
].join(', ');

// ─── Detail columns (full, including JSON) ─────────────────────────────────────
const DETAIL_COLUMNS = '*';

// ─── WHERE clause builder ──────────────────────────────────────────────────────
interface WhereResult {
  clause: string;
  params: unknown[];
}

function buildWhere(q: Partial<TicketListQuery> & Record<string, unknown>): WhereResult {
  const conditions: string[] = [];
  const params: unknown[] = [];

  // Global search — server-side LIKE across key fields
  const searchVal = (q.search as string) || '';
  if (searchVal) {
    const like = `%${searchVal}%`;
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
      airline LIKE ? OR
      address LIKE ?
    )`);
    params.push(like, like, like, like, like, like, like, like, like, like, like, like);
  }

  // String exact/partial filters (handling both camelCase and snake_case)
  const stringFilters: Array<[unknown, string]> = [
    [q.claimNumber ?? q.claim_number, 'claim_number'],
    [q.ticketId ?? q.ticket_id, 'ticket_id'],
    [q.postId ?? q.post_id, 'post_id'],
    [q.firstName ?? q.first_name, 'first_name'],
    [q.lastName ?? q.last_name, 'last_name'],
    [q.email, 'email'],
    [q.requester, 'requester'],
    [q.assignee, 'assignee'],
    [q.claimStatus ?? q.claim_status, 'claim_status'],
    [q.ticketStatus ?? q.ticket_status, 'ticket_status'],
    [q.dashboardStatus ?? q.dashboard_status, 'dashboard_status'],
    [q.airline, 'airline'],
    [q.flightNumber ?? q.flight_number, 'flight_number'],
    [q.departureCountry ?? q.departure_country, 'departure_country'],
    [q.destinationCountry ?? q.destination_country, 'destination_country'],
    [q.source, 'source'],
    [q.eventType ?? q.event_type, 'event_type'],
    [q.preferredLanguage ?? q.preferred_language, 'preferred_language'],
    [q.originalClaimLanguage ?? q.original_claim_language, 'original_claim_language'],
  ];

  for (const [val, col] of stringFilters) {
    if (val !== undefined && val !== null && val !== '') {
      conditions.push(`${col} LIKE ?`);
      params.push(`%${String(val)}%`);
    }
  }

  // Boolean filters
  const boolFilters: Array<[unknown, string]> = [
    [q.needPaymentDetails ?? q.need_payment_details, 'need_payment_details'],
    [q.needResign ?? q.need_resign, 'need_resign'],
    [q.dashboardCompleted ?? q.is_dashboard_completed ?? q.dashboard_completed, 'is_dashboard_completed'],
    [q.whatsappNotification ?? q.whatsapp_notification, 'whatsapp_notification'],
    [q.multiplePassengers ?? q.multiple_passengers, 'multiple_passengers'],
    [q.acceptanceDateMandatory ?? q.acceptance_date_mandatory, 'acceptance_date_mandatory'],
  ];

  for (const [val, col] of boolFilters) {
    if (val !== undefined && val !== null && val !== '') {
      const isTrue = val === true || val === 'true' || val === 1 || val === '1';
      conditions.push(`${col} = ?`);
      params.push(isTrue ? 1 : 0);
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
  const targetCol = sortBy ? (SORT_COLUMN_MAP[sortBy] || SORT_COLUMN_MAP[sortBy.toLowerCase()]) : undefined;
  const col = targetCol || 'updated_at';
  const dir = sortDir?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
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
  phone_number?: string;
  address?: string;
  airline: string;
  airline_country?: string;
  flight_number: string;
  scheduled_date: string;
  departure_airport: string;
  departure_airport_iata: string;
  departure_country?: string;
  destination_airport: string;
  destination_airport_iata: string;
  destination_country?: string;
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
  money_received_date?: string;
  claim_acceptance_date?: string;
  solved_date?: string;
  jurisdiction_1st?: string;
  jurisdiction_2nd?: string;
  booking_reference_number?: string;
  call_status?: string;
  closure_reason?: string;
  disruption?: string;
  legal_fee_to_be_charged?: string;
  total_passengers_number?: number;
  where_did_you_hear_about_refly?: string;
  complete_route?: string;
  dashboard_link?: string;
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
