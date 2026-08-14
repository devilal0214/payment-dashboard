/**
 * lib/queries/stats.ts
 *
 * KPI aggregate queries. All done in SQL.
 * Respects the same filter parameters as the list query.
 */
import { query } from '@/lib/db/pool';
import type { TicketListQuery } from '@/lib/validation/tickets.schema';

// Reuse WHERE clause builder (imported from tickets module pattern)
// We rebuild it here to avoid circular deps
function buildWhere(q: Partial<TicketListQuery>): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (q.search) {
    const like = `%${q.search}%`;
    conditions.push(`(claim_number LIKE ? OR ticket_id LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR airline LIKE ?)`);
    params.push(like, like, like, like, like, like);
  }

  const stringFilters: Array<[keyof TicketListQuery, string]> = [
    ['claimNumber', 'claim_number'],
    ['claimStatus', 'claim_status'],
    ['ticketStatus', 'ticket_status'],
    ['dashboardStatus', 'dashboard_status'],
    ['airline', 'airline'],
    ['source', 'source'],
    ['assignee', 'assignee'],
    ['departureCountry', 'departure_country'],
    ['destinationCountry', 'destination_country'],
  ];

  for (const [key, col] of stringFilters) {
    const val = q[key] as string | undefined;
    if (val) { conditions.push(`${col} LIKE ?`); params.push(`%${val}%`); }
  }

  const boolFilters: Array<[keyof TicketListQuery, string]> = [
    ['needPaymentDetails', 'need_payment_details'],
    ['needResign', 'need_resign'],
    ['dashboardCompleted', 'is_dashboard_completed'],
  ];
  for (const [key, col] of boolFilters) {
    const val = q[key] as boolean | undefined;
    if (val !== undefined) { conditions.push(`${col} = ?`); params.push(val ? 1 : 0); }
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
      COALESCE(SUM(amount_received), 0)                                AS totalAmountReceived
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
  };
}
