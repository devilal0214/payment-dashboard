/**
 * lib/queries/filter-options.ts
 *
 * Returns distinct values for filter dropdowns.
 * Cached aggressively since these don't change often.
 */
import { query } from '@/lib/db/pool';

type DistinctValues = string[];

async function getDistinct(column: string, limit = 200): Promise<DistinctValues> {
  // Column name is hardcoded — never from user input
  const rows = await query<{ val: string }>(
    `SELECT DISTINCT ${column} AS val
     FROM reporting_tickets
     WHERE ${column} IS NOT NULL AND ${column} != ''
     ORDER BY ${column} ASC
     LIMIT ?`,
    [limit],
  );
  return rows.map((r) => r.val).filter(Boolean);
}

export interface FilterOptions {
  claimStatuses: string[];
  ticketStatuses: string[];
  dashboardStatuses: string[];
  airlines: string[];
  sources: string[];
  eventTypes: string[];
  preferredLanguages: string[];
  originalClaimLanguages: string[];
  assignees: string[];
  departureCountries: string[];
  destinationCountries: string[];
}

export async function getFilterOptions(): Promise<FilterOptions> {
  const [
    claimStatuses,
    ticketStatuses,
    dashboardStatuses,
    airlines,
    sources,
    eventTypes,
    preferredLanguages,
    originalClaimLanguages,
    assignees,
    departureCountries,
    destinationCountries,
  ] = await Promise.all([
    getDistinct('claim_status'),
    getDistinct('ticket_status'),
    getDistinct('dashboard_status'),
    getDistinct('airline'),
    getDistinct('source'),
    getDistinct('event_type'),
    getDistinct('preferred_language'),
    getDistinct('original_claim_language'),
    getDistinct('assignee'),
    getDistinct('departure_country'),
    getDistinct('destination_country'),
  ]);

  return {
    claimStatuses,
    ticketStatuses,
    dashboardStatuses,
    airlines,
    sources,
    eventTypes,
    preferredLanguages,
    originalClaimLanguages,
    assignees,
    departureCountries,
    destinationCountries,
  };
}
