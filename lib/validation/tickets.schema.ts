/**
 * lib/validation/tickets.schema.ts
 *
 * Zod schemas for all ticket query parameters.
 * Used by API routes to validate and sanitize input.
 */
import { z } from 'zod';

// Allowed sort columns — NEVER allow arbitrary user input into SQL ORDER BY
export const ALLOWED_SORT_COLUMNS = [
  'claim_number',
  'claim_status',
  'ticket_status',
  'scheduled_date',
  'compensation_amount',
  'amount_received',
  'airline',
  'first_name',
  'last_name',
  'requested_date',
  'updated_at',
  'source',
] as const;

export type SortColumn = (typeof ALLOWED_SORT_COLUMNS)[number];

const booleanQueryParam = z
  .string()
  .optional()
  .transform((v) => {
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
    return undefined;
  });

const dateParam = z.string().optional().refine((v) => {
  if (!v) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}, 'Must be YYYY-MM-DD');

const numericParam = z
  .string()
  .optional()
  .transform((v) => (v ? parseFloat(v) : undefined))
  .refine((v) => v === undefined || !isNaN(v), 'Must be a number');

export const ticketListQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(250).default(25),

  // Sorting
  sortBy: z.enum(ALLOWED_SORT_COLUMNS).optional().default('updated_at'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),

  // Global search
  search: z.string().max(200).optional(),

  // String filters
  claimNumber: z.string().max(100).optional(),
  ticketId: z.string().max(50).optional(),
  postId: z.string().max(50).optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.string().max(200).optional(),
  requester: z.string().max(200).optional(),
  assignee: z.string().max(200).optional(),
  claimStatus: z.string().max(100).optional(),
  ticketStatus: z.string().max(100).optional(),
  dashboardStatus: z.string().max(100).optional(),
  airline: z.string().max(200).optional(),
  flightNumber: z.string().max(50).optional(),
  departureCountry: z.string().max(100).optional(),
  destinationCountry: z.string().max(100).optional(),
  source: z.string().max(100).optional(),
  eventType: z.string().max(100).optional(),
  preferredLanguage: z.string().max(100).optional(),
  originalClaimLanguage: z.string().max(100).optional(),

  // Boolean filters
  needPaymentDetails: booleanQueryParam,
  needResign: booleanQueryParam,
  dashboardCompleted: booleanQueryParam,
  whatsappNotification: booleanQueryParam,
  multiplePassengers: booleanQueryParam,
  acceptanceDateMandatory: booleanQueryParam,

  // Date range filters
  requestedDateFrom: dateParam,
  requestedDateTo: dateParam,
  solvedDateFrom: dateParam,
  solvedDateTo: dateParam,
  scheduledDateFrom: dateParam,
  scheduledDateTo: dateParam,
  claimAcceptanceDateFrom: dateParam,
  claimAcceptanceDateTo: dateParam,
  moneyReceivedDateFrom: dateParam,
  moneyReceivedDateTo: dateParam,

  // Numeric range filters
  compensationMin: numericParam,
  compensationMax: numericParam,
  amountReceivedMin: numericParam,
  amountReceivedMax: numericParam,
});

export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;

export const ticketExportQuerySchema = ticketListQuerySchema.extend({
  format: z.enum(['csv', 'xlsx']).default('csv'),
  includeAdvanced: booleanQueryParam,
  selectedIds: z.string().optional(), // comma-separated IDs
});

export type TicketExportQuery = z.infer<typeof ticketExportQuerySchema>;
