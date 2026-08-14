'use client';

import type { ReadonlyURLSearchParams } from 'next/navigation';

// Human-readable labels for filter keys
const FILTER_LABELS: Record<string, string> = {
  search: 'Search',
  claimNumber: 'Claim #',
  ticketId: 'Ticket ID',
  postId: 'Post ID',
  firstName: 'First Name',
  lastName: 'Last Name',
  email: 'Email',
  requester: 'Requester',
  assignee: 'Assignee',
  claimStatus: 'Claim Status',
  ticketStatus: 'Ticket Status',
  dashboardStatus: 'Dashboard',
  airline: 'Airline',
  flightNumber: 'Flight #',
  departureCountry: 'Dep. Country',
  destinationCountry: 'Dest. Country',
  source: 'Source',
  eventType: 'Event Type',
  preferredLanguage: 'Language',
  originalClaimLanguage: 'Original Lang.',
  needPaymentDetails: 'Need Payment',
  needResign: 'Need Re-sign',
  dashboardCompleted: 'Dashboard Done',
  whatsappNotification: 'WhatsApp',
  multiplePassengers: 'Multi Pax',
  acceptanceDateMandatory: 'Acceptance Mandatory',
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
    <div className="flex items-center gap-2 flex-wrap">
      {filterKeys.map((key) => {
        const value = searchParams.get(key) ?? '';
        const label = FILTER_LABELS[key] ?? key;
        return (
          <span key={key} className="filter-chip">
            <span className="text-text-muted">{label}:</span>
            <span>{value}</span>
            <button
              onClick={() => onRemove(key)}
              className="ml-0.5 text-brand-400/70 hover:text-brand-300"
              aria-label={`Remove ${label} filter`}
            >
              ×
            </button>
          </span>
        );
      })}
      <button
        id="filter-clear-all"
        onClick={onClearAll}
        className="text-xs text-text-muted hover:text-text-secondary underline-offset-2 hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
