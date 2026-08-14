'use client';

import { useState, useEffect } from 'react';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import type { FilterOptions } from '@/lib/queries/filter-options';

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  filterOptions: FilterOptions | null;
  searchParams: ReadonlyURLSearchParams;
  onApply: (filters: Record<string, string>) => void;
}

const BOOL_OPTIONS = [
  { label: 'Any', value: '' },
  { label: 'Yes', value: 'true' },
  { label: 'No', value: 'false' },
];

export default function FilterDrawer({
  open, onClose, filterOptions, searchParams, onApply,
}: FilterDrawerProps) {
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Initialize from current URL params
  useEffect(() => {
    const current: Record<string, string> = {};
    searchParams.forEach((v: string, k: string) => {
      if (!['page', 'pageSize', 'sortBy', 'sortDir', 'search'].includes(k)) {
        current[k] = v;
      }
    });
    setFilters(current);
  }, [searchParams, open]);

  function set(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clear() {
    setFilters({});
  }

  function handleApply() {
    // Remove empty values
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== '') clean[k] = v;
    }
    onApply(clean);
  }

  if (!open) return null;

  const options = filterOptions;

  const SelectFilter = ({ label, filterKey, opts }: { label: string; filterKey: string; opts: string[] }) => (
    <div>
      <label className="block text-xs text-text-muted mb-1">{label}</label>
      <select
        value={filters[filterKey] || ''}
        onChange={(e) => set(filterKey, e.target.value)}
        className="input-base text-xs py-1.5"
      >
        <option value="">Any</option>
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const TextFilter = ({ label, filterKey, placeholder }: { label: string; filterKey: string; placeholder?: string }) => (
    <div>
      <label className="block text-xs text-text-muted mb-1">{label}</label>
      <input
        type="text"
        value={filters[filterKey] || ''}
        onChange={(e) => set(filterKey, e.target.value)}
        placeholder={placeholder || ''}
        className="input-base text-xs py-1.5"
      />
    </div>
  );

  const DateFilter = ({ label, fromKey, toKey }: { label: string; fromKey: string; toKey: string }) => (
    <div>
      <label className="block text-xs text-text-muted mb-1">{label}</label>
      <div className="flex gap-2">
        <input type="date" value={filters[fromKey] || ''} onChange={(e) => set(fromKey, e.target.value)} className="input-base text-xs py-1.5 flex-1" />
        <input type="date" value={filters[toKey] || ''} onChange={(e) => set(toKey, e.target.value)} className="input-base text-xs py-1.5 flex-1" />
      </div>
    </div>
  );

  const BoolFilter = ({ label, filterKey }: { label: string; filterKey: string }) => (
    <div>
      <label className="block text-xs text-text-muted mb-1">{label}</label>
      <div className="flex gap-1">
        {BOOL_OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => set(filterKey, o.value)}
            className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
              (filters[filterKey] || '') === o.value
                ? 'bg-brand-600/25 border-brand-500/40 text-brand-300'
                : 'bg-surface-3 border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* Overlay */}
      <div className="drawer-overlay" onClick={onClose} />

      {/* Panel */}
      <div className="drawer-panel w-[480px] max-w-full animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-surface-1 border-b border-border px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-sm font-semibold text-text-primary">Advanced Filters</h2>
          <button id="filter-drawer-close" onClick={onClose} className="text-text-muted hover:text-text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* ── Identifiers ─────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Identifiers</h3>
            <div className="grid grid-cols-2 gap-3">
              <TextFilter label="Claim Number" filterKey="claimNumber" placeholder="e.g. CLM-12345" />
              <TextFilter label="Ticket ID" filterKey="ticketId" placeholder="Zendesk ID" />
              <TextFilter label="Post ID" filterKey="postId" placeholder="Post ID" />
            </div>
          </section>

          {/* ── Customer ─────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Customer</h3>
            <div className="grid grid-cols-2 gap-3">
              <TextFilter label="First Name" filterKey="firstName" />
              <TextFilter label="Last Name" filterKey="lastName" />
              <TextFilter label="Email" filterKey="email" />
              <TextFilter label="Requester" filterKey="requester" />
              <TextFilter label="Assignee" filterKey="assignee" />
            </div>
          </section>

          {/* ── Statuses ─────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Statuses</h3>
            <div className="grid grid-cols-2 gap-3">
              <SelectFilter label="Claim Status" filterKey="claimStatus" opts={options?.claimStatuses ?? []} />
              <SelectFilter label="Ticket Status" filterKey="ticketStatus" opts={options?.ticketStatuses ?? []} />
              <SelectFilter label="Dashboard Status" filterKey="dashboardStatus" opts={options?.dashboardStatuses ?? []} />
              <SelectFilter label="Source" filterKey="source" opts={options?.sources ?? []} />
              <SelectFilter label="Event Type" filterKey="eventType" opts={options?.eventTypes ?? []} />
            </div>
          </section>

          {/* ── Flight ─────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Flight</h3>
            <div className="grid grid-cols-2 gap-3">
              <TextFilter label="Airline" filterKey="airline" />
              <TextFilter label="Flight Number" filterKey="flightNumber" />
              <SelectFilter label="Departure Country" filterKey="departureCountry" opts={options?.departureCountries ?? []} />
              <SelectFilter label="Destination Country" filterKey="destinationCountry" opts={options?.destinationCountries ?? []} />
            </div>
          </section>

          {/* ── Language ─────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Language</h3>
            <div className="grid grid-cols-2 gap-3">
              <SelectFilter label="Preferred Language" filterKey="preferredLanguage" opts={options?.preferredLanguages ?? []} />
              <SelectFilter label="Original Claim Language" filterKey="originalClaimLanguage" opts={options?.originalClaimLanguages ?? []} />
            </div>
          </section>

          {/* ── Boolean flags ─────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Flags</h3>
            <div className="grid grid-cols-2 gap-3">
              <BoolFilter label="Need Payment Details" filterKey="needPaymentDetails" />
              <BoolFilter label="Need Re-sign" filterKey="needResign" />
              <BoolFilter label="Dashboard Completed" filterKey="dashboardCompleted" />
              <BoolFilter label="WhatsApp Notification" filterKey="whatsappNotification" />
              <BoolFilter label="Multiple Passengers" filterKey="multiplePassengers" />
              <BoolFilter label="Acceptance Date Mandatory" filterKey="acceptanceDateMandatory" />
            </div>
          </section>

          {/* ── Date ranges ────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Date Ranges</h3>
            <div className="space-y-3">
              <DateFilter label="Requested Date" fromKey="requestedDateFrom" toKey="requestedDateTo" />
              <DateFilter label="Solved Date" fromKey="solvedDateFrom" toKey="solvedDateTo" />
              <DateFilter label="Scheduled Date" fromKey="scheduledDateFrom" toKey="scheduledDateTo" />
              <DateFilter label="Claim Acceptance Date" fromKey="claimAcceptanceDateFrom" toKey="claimAcceptanceDateTo" />
              <DateFilter label="Money Received Date" fromKey="moneyReceivedDateFrom" toKey="moneyReceivedDateTo" />
            </div>
          </section>

          {/* ── Numeric ranges ──────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Amount Ranges</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">Compensation Min (€)</label>
                <input type="number" value={filters.compensationMin || ''} onChange={(e) => set('compensationMin', e.target.value)} className="input-base text-xs py-1.5" min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Compensation Max (€)</label>
                <input type="number" value={filters.compensationMax || ''} onChange={(e) => set('compensationMax', e.target.value)} className="input-base text-xs py-1.5" min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Amount Received Min (€)</label>
                <input type="number" value={filters.amountReceivedMin || ''} onChange={(e) => set('amountReceivedMin', e.target.value)} className="input-base text-xs py-1.5" min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Amount Received Max (€)</label>
                <input type="number" value={filters.amountReceivedMax || ''} onChange={(e) => set('amountReceivedMax', e.target.value)} className="input-base text-xs py-1.5" min="0" step="0.01" />
              </div>
            </div>
          </section>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-surface-1 border-t border-border px-5 py-4 flex items-center gap-3">
          <button
            id="filter-apply"
            onClick={handleApply}
            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            Apply Filters
          </button>
          <button
            id="filter-clear"
            onClick={clear}
            className="px-4 py-2.5 bg-surface-3 border border-border hover:border-brand-500/40 text-text-secondary hover:text-text-primary rounded-lg text-sm transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </>
  );
}
