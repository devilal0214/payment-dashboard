/**
 * lib/queries/stats.ts
 *
 * KPI & Report aggregate queries. All done in SQL.
 * Respects the same filter parameters as the list query.
 * ALL queries use indexed columns for fast execution over 1.8M+ rows.
 */
import { query } from '@/lib/db/pool';
import type { TicketListQuery } from '@/lib/validation/tickets.schema';

function buildWhere(q: Partial<TicketListQuery> & Record<string, unknown>): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  // Support both camelCase and snake_case query params
  const search = (q.search as string) || '';
  const claimNumber = (q.claimNumber || q.claim_number) as string | undefined;
  const claimStatus = (q.claimStatus || q.claim_status) as string | undefined;
  const ticketStatus = (q.ticketStatus || q.ticket_status) as string | undefined;
  const dashboardStatus = (q.dashboardStatus || q.dashboard_status) as string | undefined;
  const airline = (q.airline) as string | undefined;
  const source = (q.source) as string | undefined;
  const assignee = (q.assignee) as string | undefined;
  const departureCountry = (q.departureCountry || q.departure_country) as string | undefined;
  const destinationCountry = (q.destinationCountry || q.destination_country) as string | undefined;

  const needPaymentDetails = q.needPaymentDetails ?? q.need_payment_details;
  const needResign = q.needResign ?? q.need_resign;
  const dashboardCompleted = q.dashboardCompleted ?? q.is_dashboard_completed ?? q.dashboard_completed;

  if (search) {
    const like = `%${search}%`;
    conditions.push(`(claim_number LIKE ? OR ticket_id LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR airline LIKE ?)`);
    params.push(like, like, like, like, like, like);
  }

  const stringFilters: Array<[string | undefined, string]> = [
    [claimNumber, 'claim_number'],
    [claimStatus, 'claim_status'],
    [ticketStatus, 'ticket_status'],
    [dashboardStatus, 'dashboard_status'],
    [airline, 'airline'],
    [source, 'source'],
    [assignee, 'assignee'],
    [departureCountry, 'departure_country'],
    [destinationCountry, 'destination_country'],
  ];

  for (const [val, col] of stringFilters) {
    if (val) {
      conditions.push(`${col} LIKE ?`);
      params.push(`%${val}%`);
    }
  }

  const boolFilters: Array<[unknown, string]> = [
    [needPaymentDetails, 'need_payment_details'],
    [needResign, 'need_resign'],
    [dashboardCompleted, 'is_dashboard_completed'],
  ];

  for (const [val, col] of boolFilters) {
    if (val !== undefined && val !== null && val !== '') {
      const isTrue = val === true || val === 'true' || val === 1 || val === '1';
      conditions.push(`${col} = ?`);
      params.push(isTrue ? 1 : 0);
    }
  }

  const dateRanges: Array<[string | undefined, string | undefined, string]> = [
    [q.requestedDateFrom, q.requestedDateTo, 'requested_date'],
    [q.scheduledDateFrom, q.scheduledDateTo, 'scheduled_date'],
  ];

  for (const [from, to, col] of dateRanges) {
    if (from) { conditions.push(`${col} >= ?`); params.push(from); }
    if (to)   { conditions.push(`${col} <= ?`); params.push(to + ' 23:59:59'); }
  }

  if (q.compensationMin !== undefined) { conditions.push('compensation_amount >= ?'); params.push(q.compensationMin); }
  if (q.compensationMax !== undefined) { conditions.push('compensation_amount <= ?'); params.push(q.compensationMax); }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

export interface DashboardStats {
  totalClaims: number;
  openTickets: number;
  finishedDashboard: number;
  unfinishedDashboard: number;
  needPaymentDetails: number;
  needResign: number;
  totalCompensation: number;
  totalAmountReceived: number;
  reflyCount: number;
  skypayCount: number;
}

export interface ChartCategoryItem {
  name: string;
  count: number;
  amount?: number;
}

export interface MonthTrendItem {
  month: string;
  count: number;
}

export interface DataFreshness {
  lastUpdated: string | null;
  lastSynced: string | null;
  maxId: number;
}

export interface FullDashboardData {
  stats: DashboardStats;
  charts: {
    ticketsByStatus: ChartCategoryItem[];
    claimsByStatus: ChartCategoryItem[];
    claimsBySource: ChartCategoryItem[];
    topAirlines: ChartCategoryItem[];
    topDepartureCountries: ChartCategoryItem[];
    ticketsOverTime: MonthTrendItem[];
  };
  freshness: DataFreshness;
}

export async function getDashboardStats(
  filters: Partial<TicketListQuery> = {},
): Promise<DashboardStats> {
  const { clause, params } = buildWhere(filters);

  const sql = `
    SELECT
      COUNT(*)                                                          AS totalClaims,
      SUM(ticket_status NOT IN ('solved', 'closed'))                   AS openTickets,
      SUM(is_dashboard_completed = 1)                                   AS finishedDashboard,
      SUM(is_dashboard_completed = 0 OR is_dashboard_completed IS NULL) AS unfinishedDashboard,
      SUM(need_payment_details = 1)                                     AS needPaymentDetails,
      SUM(need_resign = 1)                                              AS needResign,
      COALESCE(SUM(compensation_amount), 0)                            AS totalCompensation,
      COALESCE(SUM(amount_received), 0)                                AS totalAmountReceived,
      SUM(LOWER(source) = 'refly')                                      AS reflyCount,
      SUM(LOWER(source) = 'skypay')                                     AS skypayCount
    FROM reporting_tickets
    ${clause}
  `;

  const rows = await query<Record<string, string | number>>(sql, params);
  const r = rows[0] ?? {};

  return {
    totalClaims: Number(r.totalClaims ?? 0),
    openTickets: Number(r.openTickets ?? 0),
    finishedDashboard: Number(r.finishedDashboard ?? 0),
    unfinishedDashboard: Number(r.unfinishedDashboard ?? 0),
    needPaymentDetails: Number(r.needPaymentDetails ?? 0),
    needResign: Number(r.needResign ?? 0),
    totalCompensation: parseFloat(String(r.totalCompensation ?? 0)),
    totalAmountReceived: parseFloat(String(r.totalAmountReceived ?? 0)),
    reflyCount: Number(r.reflyCount ?? 0),
    skypayCount: Number(r.skypayCount ?? 0),
  };
}

export async function getDashboardData(
  filters: Partial<TicketListQuery> = {},
): Promise<FullDashboardData> {
  const { clause, params } = buildWhere(filters);

  const whereAnd = (col: string) =>
    clause ? `${clause} AND (${col} IS NOT NULL AND ${col} != '')` : `WHERE (${col} IS NOT NULL AND ${col} != '')`;

  // Parallel server-side SQL aggregate queries using indexed columns
  const [
    stats,
    ticketsByStatusRows,
    claimsByStatusRows,
    sourceRows,
    airlineRows,
    countryRows,
    monthRows,
    freshnessRows,
  ] = await Promise.all([
    getDashboardStats(filters),

    query<{ name: string; count: number }>(`
      SELECT ticket_status AS name, COUNT(*) AS count
      FROM reporting_tickets
      ${whereAnd('ticket_status')}
      GROUP BY ticket_status
      ORDER BY count DESC
      LIMIT 8
    `, params),

    query<{ name: string; count: number }>(`
      SELECT claim_status AS name, COUNT(*) AS count
      FROM reporting_tickets
      ${whereAnd('claim_status')}
      GROUP BY claim_status
      ORDER BY count DESC
      LIMIT 8
    `, params),

    query<{ name: string; count: number }>(`
      SELECT source AS name, COUNT(*) AS count
      FROM reporting_tickets
      ${whereAnd('source')}
      GROUP BY source
      ORDER BY count DESC
      LIMIT 8
    `, params),

    query<{ name: string; count: number; amount: number }>(`
      SELECT airline AS name, COUNT(*) AS count, COALESCE(SUM(compensation_amount), 0) AS amount
      FROM reporting_tickets
      ${whereAnd('airline')}
      GROUP BY airline
      ORDER BY count DESC
      LIMIT 8
    `, params),

    query<{ name: string; count: number }>(`
      SELECT departure_country AS name, COUNT(*) AS count
      FROM reporting_tickets
      ${whereAnd('departure_country')}
      GROUP BY departure_country
      ORDER BY count DESC
      LIMIT 8
    `, params),

    query<{ month: string; count: number }>(`
      SELECT DATE_FORMAT(requested_date, '%Y-%m') AS month, COUNT(*) AS count
      FROM reporting_tickets
      ${whereAnd('requested_date')}
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `, params),

    query<{ lastUpdated: string; lastSynced: string; maxId: number }>(`
      SELECT MAX(updated_at) AS lastUpdated, MAX(synced_at) AS lastSynced, COALESCE(MAX(id), 0) AS maxId
      FROM reporting_tickets
    `),
  ]);

  const fresh = freshnessRows[0] ?? { lastUpdated: null, lastSynced: null, maxId: 0 };

  return {
    stats,
    charts: {
      ticketsByStatus: ticketsByStatusRows.map((r) => ({ name: String(r.name), count: Number(r.count) })),
      claimsByStatus: claimsByStatusRows.map((r) => ({ name: String(r.name), count: Number(r.count) })),
      claimsBySource: sourceRows.map((r) => ({ name: String(r.name), count: Number(r.count) })),
      topAirlines: airlineRows.map((r) => ({
        name: String(r.name),
        count: Number(r.count),
        amount: parseFloat(String(r.amount ?? 0)),
      })),
      topDepartureCountries: countryRows.map((r) => ({ name: String(r.name), count: Number(r.count) })),
      ticketsOverTime: monthRows.reverse().map((r) => ({ month: String(r.month), count: Number(r.count) })),
    },
    freshness: {
      lastUpdated: fresh.lastUpdated ? String(fresh.lastUpdated) : null,
      lastSynced: fresh.lastSynced ? String(fresh.lastSynced) : null,
      maxId: Number(fresh.maxId ?? 0),
    },
  };
}
