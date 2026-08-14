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

  // Initialize from current URL params (supporting both camelCase and snake_case)
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
      <label className="block text-xs font-semibold text-zinc-600 mb-1">{label}</label>
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
      <label className="block text-xs font-semibold text-zinc-600 mb-1">{label}</label>
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
      <label className="block text-xs font-semibold text-zinc-600 mb-1">{label}</label>
      <div className="flex gap-2">
        <input type="date" value={filters[fromKey] || ''} onChange={(e) => set(fromKey, e.target.value)} className="input-base text-xs py-1.5 flex-1 font-mono" />
        <input type="date" value={filters[toKey] || ''} onChange={(e) => set(toKey, e.target.value)} className="input-base text-xs py-1.5 flex-1 font-mono" />
      </div>
    </div>
  );

  const BoolFilter = ({ label, filterKey }: { label: string; filterKey: string }) => (
    <div>
      <label className="block text-xs font-semibold text-zinc-600 mb-1">{label}</label>
      <div className="flex gap-1 select-none">
        {BOOL_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => set(filterKey, o.value)}
            className={`flex-1 py-1 text-xs rounded border font-medium transition-colors ${
              (filters[filterKey] || '') === o.value
                ? 'bg-zinc-900 border-zinc-900 text-white'
                : 'bg-white border-zinc-300 text-zinc-700 hover:border-zinc-900'
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
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel w-[480px] max-w-full animate-slide-in-right flex flex-col h-full bg-white">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-sm font-bold text-zinc-950">Advanced Filter Console</h2>
            <p className="text-[11px] text-zinc-500">Construct indexed SQL queries over 1.8M+ records</p>
          </div>
          <button id="filter-drawer-close" onClick={onClose} className="text-zinc-400 hover:text-zinc-950 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Identifiers */}
          <section>
            <h3 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-3">Identifiers</h3>
            <div className="grid grid-cols-2 gap-3">
              <TextFilter label="Claim Number" filterKey="claimNumber" placeholder="e.g. CLM-12345" />
              <TextFilter label="Ticket ID" filterKey="ticketId" placeholder="Zendesk ID" />
              <TextFilter label="Post ID" filterKey="postId" placeholder="Post ID" />
            </div>
          </section>

          {/* Customer */}
          <section>
            <h3 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-3">Customer Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <TextFilter label="First Name" filterKey="firstName" />
              <TextFilter label="Last Name" filterKey="lastName" />
              <TextFilter label="Email" filterKey="email" />
              <TextFilter label="Requester" filterKey="requester" />
              <TextFilter label="Assignee" filterKey="assignee" />
            </div>
          </section>

          {/* Statuses */}
          <section>
            <h3 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-3">Statuses & Channels</h3>
            <div className="grid grid-cols-2 gap-3">
              <SelectFilter label="Claim Status" filterKey="claimStatus" opts={options?.claimStatuses ?? []} />
              <SelectFilter label="Ticket Status" filterKey="ticketStatus" opts={options?.ticketStatuses ?? []} />
              <SelectFilter label="Dashboard Status" filterKey="dashboardStatus" opts={options?.dashboardStatuses ?? []} />
              <SelectFilter label="Source" filterKey="source" opts={options?.sources ?? []} />
              <SelectFilter label="Event Type" filterKey="eventType" opts={options?.eventTypes ?? []} />
            </div>
          </section>

          {/* Flight */}
          <section>
            <h3 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-3">Flight Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <TextFilter label="Airline" filterKey="airline" />
              <TextFilter label="Flight Number" filterKey="flightNumber" />
              <SelectFilter label="Departure Country" filterKey="departureCountry" opts={options?.departureCountries ?? []} />
              <SelectFilter label="Destination Country" filterKey="destinationCountry" opts={options?.destinationCountries ?? []} />
            </div>
          </section>

          {/* Boolean Flags */}
          <section>
            <h3 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-3">Operational Flags</h3>
            <div className="grid grid-cols-2 gap-3">
              <BoolFilter label="Need Payment Details" filterKey="needPaymentDetails" />
              <BoolFilter label="Need Re-sign" filterKey="needResign" />
              <BoolFilter label="Dashboard Completed" filterKey="dashboardCompleted" />
              <BoolFilter label="WhatsApp Notification" filterKey="whatsappNotification" />
              <BoolFilter label="Multiple Passengers" filterKey="multiplePassengers" />
              <BoolFilter label="Acceptance Date Mandatory" filterKey="acceptanceDateMandatory" />
            </div>
          </section>

          {/* Date Ranges */}
          <section>
            <h3 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-3">Date Boundaries</h3>
            <div className="space-y-3">
              <DateFilter label="Requested Date" fromKey="requestedDateFrom" toKey="requestedDateTo" />
              <DateFilter label="Solved Date" fromKey="solvedDateFrom" toKey="solvedDateTo" />
              <DateFilter label="Scheduled Date" fromKey="scheduledDateFrom" toKey="scheduledDateTo" />
            </div>
          </section>

          {/* Numeric Ranges */}
          <section>
            <h3 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-3">Amounts (€)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Compensation Min (€)</label>
                <input type="number" value={filters.compensationMin || ''} onChange={(e) => set('compensationMin', e.target.value)} className="input-base text-xs py-1.5 font-mono" min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Compensation Max (€)</label>
                <input type="number" value={filters.compensationMax || ''} onChange={(e) => set('compensationMax', e.target.value)} className="input-base text-xs py-1.5 font-mono" min="0" step="0.01" />
              </div>
            </div>
          </section>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-white border-t border-zinc-200 px-5 py-4 flex items-center gap-3">
          <button
            id="filter-apply"
            onClick={handleApply}
            className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-2.5 rounded-md text-xs shadow-subtle transition-colors"
          >
            Apply Filters
          </button>
          <button
            id="filter-clear"
            onClick={clear}
            className="px-4 py-2.5 bg-white border border-zinc-300 hover:border-zinc-900 text-zinc-700 font-semibold rounded-md text-xs transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>
    </>
  );
}
