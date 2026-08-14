'use client';

import type { ReadonlyURLSearchParams } from 'next/navigation';

// Human-readable labels for filter keys
const FILTER_LABELS: Record<string, string> = {
  search: 'Search',
  claimNumber: 'Claim #',
  claim_number: 'Claim #',
  ticketId: 'Ticket ID',
  ticket_id: 'Ticket ID',
  postId: 'Post ID',
  post_id: 'Post ID',
  firstName: 'First Name',
  first_name: 'First Name',
  lastName: 'Last Name',
  last_name: 'Last Name',
  email: 'Email',
  requester: 'Requester',
  assignee: 'Assignee',
  claimStatus: 'Claim Status',
  claim_status: 'Claim Status',
  ticketStatus: 'Ticket Status',
  ticket_status: 'Ticket Status',
  dashboardStatus: 'Dashboard',
  dashboard_status: 'Dashboard',
  airline: 'Airline',
  flightNumber: 'Flight #',
  flight_number: 'Flight #',
  departureCountry: 'Dep. Country',
  departure_country: 'Dep. Country',
  destinationCountry: 'Dest. Country',
  destination_country: 'Dest. Country',
  source: 'Source',
  eventType: 'Event Type',
  event_type: 'Event Type',
  preferredLanguage: 'Language',
  preferred_language: 'Language',
  originalClaimLanguage: 'Original Lang.',
  original_claim_language: 'Original Lang.',
  needPaymentDetails: 'Need Payment',
  need_payment_details: 'Need Payment',
  needResign: 'Need Re-sign',
  need_resign: 'Need Re-sign',
  dashboardCompleted: 'Dashboard Done',
  dashboard_completed: 'Dashboard Done',
  is_dashboard_completed: 'Dashboard Done',
  whatsappNotification: 'WhatsApp',
  whatsapp_notification: 'WhatsApp',
  multiplePassengers: 'Multi Pax',
  multiple_passengers: 'Multi Pax',
  acceptanceDateMandatory: 'Acceptance Mandatory',
  acceptance_date_mandatory: 'Acceptance Mandatory',
  requestedDateFrom: 'Requested From',
  requestedDateTo: 'Requested To',
  solvedDateFrom: 'Solved From',
  solvedDateTo: 'Solved To',
  scheduledDateFrom: 'Scheduled From',
  scheduledDateTo: 'Scheduled To',
  claimAcceptanceDateFrom: 'Acceptance From',
  claimAcceptanceDateTo: 'Acceptance To',
  moneyReceivedDateFrom: 'Received From',
  moneyReceivedDateTo: 'Received To',
  compensationMin: 'Comp. Min',
  compensationMax: 'Comp. Max',
  amountReceivedMin: 'Received Min',
  amountReceivedMax: 'Received Max',
};

interface FilterChipsProps {
  searchParams: ReadonlyURLSearchParams;
  filterKeys: string[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
}

export default function FilterChips({ searchParams, filterKeys, onRemove, onClearAll }: FilterChipsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap select-none">
      {filterKeys.map((key) => {
        const value = searchParams.get(key) ?? '';
        const label = FILTER_LABELS[key] ?? key;
        return (
          <span key={key} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 text-white rounded-md text-xs font-medium shadow-subtle">
            <span className="text-zinc-400 font-mono text-[11px]">{label}:</span>
            <span className="font-mono font-semibold">{value}</span>
            <button
              onClick={() => onRemove(key)}
              className="ml-0.5 text-zinc-400 hover:text-white transition-colors"
              aria-label={`Remove ${label} filter`}
            >
              ✕
            </button>
          </span>
        );
      })}
      <button
        id="filter-clear-all"
        onClick={onClearAll}
        className="text-xs font-semibold text-zinc-600 hover:text-zinc-950 underline-offset-2 hover:underline ml-1"
      >
        Clear all filters
      </button>
    </div>
  );
}
