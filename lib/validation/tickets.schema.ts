/**
 * lib/validation/tickets.schema.ts
 *
 * Canonical Zod schemas and sort column mappings for all ticket query parameters.
 * Enforces strict SQL injection safety while supporting all 59 Payment Team fields.
 */
import { z } from 'zod';

// ─── Safe Sort Field Whitelist (camelCase & snake_case) ────────────────────────
export const SORT_COLUMN_MAP: Record<string, string> = {
  // Identifiers
  id: 'id',
  ticket_id: 'ticket_id',
  ticketId: 'ticket_id',
  post_id: 'post_id',
  postId: 'post_id',
  claim_number: 'claim_number',
  claimNumber: 'claim_number',
  external_id: 'post_id',
  externalId: 'post_id',

  // Statuses
  ticket_status: 'ticket_status',
  ticketStatus: 'ticket_status',
  claim_status: 'claim_status',
  claimStatus: 'claim_status',
  dashboard_status: 'dashboard_status',
  dashboardStatus: 'dashboard_status',
  is_dashboard_completed: 'is_dashboard_completed',
  dashboardCompleted: 'is_dashboard_completed',
  need_payment_details: 'need_payment_details',
  needPaymentDetails: 'need_payment_details',
  need_resign: 'need_resign',
  needResign: 'need_resign',
  call_status: 'call_status',
  callStatus: 'call_status',

  // People & Contact Info
  first_name: 'first_name',
  firstName: 'first_name',
  last_name: 'last_name',
  lastName: 'last_name',
  email: 'email',
  phone_number: 'phone_number',
  phoneNumber: 'phone_number',
  address: 'address',
  requester: 'requester',
  assignee: 'assignee',

  // Flight & Geography
  airline: 'airline',
  airline_country: 'airline_country',
  airlineCountry: 'airline_country',
  flight_number: 'flight_number',
  flightNumber: 'flight_number',
  departure_airport: 'departure_airport',
  departureAirport: 'departure_airport',
  departure_airport_iata: 'departure_airport_iata',
  departureAirportIata: 'departure_airport_iata',
  departure_country: 'departure_country',
  departureCountry: 'departure_country',
  destination_airport: 'destination_airport',
  destinationAirport: 'destination_airport',
  destination_airport_iata: 'destination_airport_iata',
  destinationAirportIata: 'destination_airport_iata',
  destination_country: 'destination_country',
  destinationCountry: 'destination_country',
  booking_reference_number: 'booking_reference_number',
  bookingReferenceNumber: 'booking_reference_number',
  disruption: 'disruption',
  complete_route: 'complete_route',
  completeRoute: 'complete_route',

  // Financials & Numbers
  compensation_amount: 'compensation_amount',
  compensationAmount: 'compensation_amount',
  amount_received: 'amount_received',
  amountReceived: 'amount_received',
  legal_fee_to_be_charged: 'legal_fee_to_be_charged',
  legalFeeToBeCharged: 'legal_fee_to_be_charged',
  total_passengers_number: 'total_passengers_number',
  totalPassengersNumber: 'total_passengers_number',

  // Dates
  requested_date: 'requested_date',
  requestedDate: 'requested_date',
  scheduled_date: 'scheduled_date',
  scheduledDate: 'scheduled_date',
  solved_date: 'solved_date',
  solvedDate: 'solved_date',
  claim_acceptance_date: 'claim_acceptance_date',
  claimAcceptanceDate: 'claim_acceptance_date',
  money_received_date: 'money_received_date',
  moneyReceivedDate: 'money_received_date',
  updated_at: 'updated_at',
  updatedAt: 'updated_at',
  synced_at: 'synced_at',
  syncedAt: 'synced_at',
  latest_update: 'latest_update',
  latestUpdate: 'latest_update',

  // Metadata & Jurisdictions
  source: 'source',
  jurisdiction_1st: 'jurisdiction_1st',
  jurisdiction1st: 'jurisdiction_1st',
  jurisdiction_2nd: 'jurisdiction_2nd',
  jurisdiction2nd: 'jurisdiction_2nd',
  closure_reason: 'closure_reason',
  closureReason: 'closure_reason',
  airline_rejection_reason: 'airline_rejection_reason',
  airlineRejectionReason: 'airline_rejection_reason',
  where_did_you_hear_about_refly: 'where_did_you_hear_about_refly',
  whereDidYouHearAboutRefly: 'where_did_you_hear_about_refly',
};

export const ALLOWED_SORT_COLUMNS = Array.from(new Set(Object.values(SORT_COLUMN_MAP)));

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

  // Safe Sorting — Preprocess to canonical column, fallback to updated_at if invalid
  sortBy: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 'updated_at';
      return SORT_COLUMN_MAP[val] || 'updated_at';
    })
    .default('updated_at'),
  sortDir: z
    .string()
    .optional()
    .transform((val) => (val?.toLowerCase() === 'asc' ? 'asc' : 'desc'))
    .default('desc'),

  // Global search
  search: z.string().max(200).optional(),

  // String filters
  claimNumber: z.string().max(100).optional(),
  claim_number: z.string().max(100).optional(),
  ticketId: z.string().max(50).optional(),
  ticket_id: z.string().max(50).optional(),
  postId: z.string().max(50).optional(),
  post_id: z.string().max(50).optional(),
  firstName: z.string().max(100).optional(),
  first_name: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  email: z.string().max(200).optional(),
  requester: z.string().max(200).optional(),
  assignee: z.string().max(200).optional(),
  claimStatus: z.string().max(100).optional(),
  claim_status: z.string().max(100).optional(),
  ticketStatus: z.string().max(100).optional(),
  ticket_status: z.string().max(100).optional(),
  dashboardStatus: z.string().max(100).optional(),
  dashboard_status: z.string().max(100).optional(),
  airline: z.string().max(200).optional(),
  flightNumber: z.string().max(50).optional(),
  flight_number: z.string().max(50).optional(),
  departureCountry: z.string().max(100).optional(),
  departure_country: z.string().max(100).optional(),
  destinationCountry: z.string().max(100).optional(),
  destination_country: z.string().max(100).optional(),
  source: z.string().max(100).optional(),
  eventType: z.string().max(100).optional(),
  event_type: z.string().max(100).optional(),
  preferredLanguage: z.string().max(100).optional(),
  preferred_language: z.string().max(100).optional(),
  originalClaimLanguage: z.string().max(100).optional(),
  original_claim_language: z.string().max(100).optional(),

  // Boolean filters
  needPaymentDetails: booleanQueryParam,
  need_payment_details: booleanQueryParam,
  needResign: booleanQueryParam,
  need_resign: booleanQueryParam,
  dashboardCompleted: booleanQueryParam,
  is_dashboard_completed: booleanQueryParam,
  whatsappNotification: booleanQueryParam,
  whatsapp_notification: booleanQueryParam,
  multiplePassengers: booleanQueryParam,
  multiple_passengers: booleanQueryParam,
  acceptanceDateMandatory: booleanQueryParam,
  acceptance_date_mandatory: booleanQueryParam,

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
  selectedIds: z.string().optional(),
});

export type TicketExportQuery = z.infer<typeof ticketExportQuerySchema>;
