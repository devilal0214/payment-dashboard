'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
} from '@tanstack/react-table';
import type { TicketRow } from '@/lib/queries/tickets';
import type { FilterOptions } from '@/lib/queries/filter-options';
import { PAYMENT_TEAM_COLUMNS } from '@/lib/export/columns';
import StatusBadge from './StatusBadge';
import BooleanBadge from './BooleanBadge';
import DocumentLink from '@/components/detail/DocumentLink';
import ColumnVisibilityMenu from './ColumnVisibilityMenu';
import FilterDrawer from '@/components/filters/FilterDrawer';
import FilterChips from '@/components/filters/FilterChips';
import Pagination from '@/components/pagination/Pagination';
import ExportMenu from '@/components/export/ExportMenu';
import DetailDrawer from '@/components/detail/DetailDrawer';
import { triggerNavigationProgress } from '@/components/layout/NavigationProgress';


interface TicketsPageClientProps {
  filterOptions: FilterOptions | null;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 250];
const STORAGE_KEY = 'refly_payment_dashboard_columns_v1';

// Default visible column set (18 core fields)
const DEFAULT_VISIBLE_IDS = new Set([
  'ticket_id', 'requested_date', 'ticket_status', 'claim_status', 'claim_number',
  'first_name', 'last_name', 'email', 'airline', 'flight_number', 'scheduled_date',
  'compensation_amount', 'amount_received', 'need_payment_details', 'need_resign',
  'dashboard_status', 'source', 'assignee',
]);

function buildDefaultVisibilityState(): VisibilityState {
  const state: VisibilityState = {};
  for (const col of PAYMENT_TEAM_COLUMNS) {
    state[col.id] = DEFAULT_VISIBLE_IDS.has(col.id);
  }
  return state;
}

// Build all 59 Payment Team Column definitions with intelligent rendering
function create59Columns(): ColumnDef<TicketRow>[] {
  const columns: ColumnDef<TicketRow>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      size: 36,
      enableSorting: false,
      enableHiding: false,
    },
  ];

  for (const spec of PAYMENT_TEAM_COLUMNS) {
    const colDef: ColumnDef<TicketRow> = {
      accessorKey: spec.id,
      header: spec.label,
      cell: ({ row, getValue }) => {
        const val = getValue();

        if (val === null || val === undefined || val === '') {
          return <span className="text-zinc-400 font-mono text-xs">—</span>;
        }

        switch (spec.type) {
          case 'currency': {
            const num = Number(val);
            return (
              <div className="text-right font-mono font-bold text-xs text-zinc-950">
                {isNaN(num) ? String(val) : `€${num.toLocaleString('en-EU', { minimumFractionDigits: 2 })}`}
              </div>
            );
          }
          case 'date': {
            const strVal = String(val);
            return (
              <span className="font-mono text-xs text-zinc-500">
                {strVal.length >= 10 ? strVal.slice(0, 16).replace('T', ' ') : strVal}
              </span>
            );
          }
          case 'badge': {
            const badgeType = spec.id.includes('claim') ? 'claim' : spec.id.includes('ticket') ? 'ticket' : spec.id.includes('dashboard') ? 'dashboard' : 'source';
            return <StatusBadge type={badgeType as any} value={String(val)} />;
          }
          case 'boolean': {
            return <BooleanBadge value={Boolean(val)} trueLabel="Yes" falseLabel="No" />;
          }
          case 'link': {
            const urlStr = String(val);
            if (!urlStr.startsWith('http')) {
              return <span className="font-mono text-xs text-zinc-600 truncate max-w-[120px] block">{urlStr}</span>;
            }
            return <DocumentLink label={spec.label} url={urlStr} />;
          }
          case 'json': {
            return (
              <span className="font-mono text-[10px] bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded text-zinc-600 truncate max-w-[120px] block">
                {String(val).slice(0, 30)}…
              </span>
            );
          }
          default: {
            const isMono = spec.id.includes('number') || spec.id.includes('id') || spec.id.includes('code') || spec.id.includes('iata') || spec.id.includes('phone') || spec.id.includes('ref');
            return (
              <span className={`text-xs ${isMono ? 'font-mono font-medium text-zinc-800' : 'text-zinc-900'} truncate max-w-[200px] block`}>
                {String(val)}
              </span>
            );
          }
        }
      },
    };

    columns.push(colDef);
  }

  return columns;
}

export default function TicketsPageClient({ filterOptions }: TicketsPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentPageSize = parseInt(searchParams.get('pageSize') || '25', 10);
  const currentSearch = searchParams.get('search') || '';
  const currentSortBy = searchParams.get('sortBy') || 'updated_at';
  const currentSortDir = (searchParams.get('sortDir') || 'desc') as 'asc' | 'desc';

  const [data, setData] = useState<TicketRow[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1, pageSize: 25, total: 0, totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(buildDefaultVisibilityState());
  const [sorting, setSorting] = useState<SortingState>([
    { id: currentSortBy, desc: currentSortDir === 'desc' },
  ]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved column preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setColumnVisibility(JSON.parse(saved));
      }
    } catch { /* ignore */ }
  }, []);

  // Save column visibility changes to localStorage
  const handleColumnVisibilityChange = useCallback((updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => {
    setColumnVisibility((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  function resetDefaultColumns() {
    const defaults = buildDefaultVisibilityState();
    setColumnVisibility(defaults);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    } catch { /* ignore */ }
  }

  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  function buildParams(overrides: Record<string, string | number | undefined> = {}): URLSearchParams {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === '') {
        params.delete(k);
      } else {
        params.set(k, String(v));
      }
    }
    return params;
  }

  function pushParams(overrides: Record<string, string | number | undefined>) {
    setLoading(true);
    triggerNavigationProgress();
    const params = buildParams(overrides);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/tickets?${searchParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json.data ?? []);
      setPagination(json.pagination ?? { page: 1, pageSize: 25, total: 0, totalPages: 0 });
    } catch {
      setError('Failed to load claim records. Please check database connectivity.');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handleSearchChange(val: string) {
    setSearchInput(val);
    setLoading(true);
    triggerNavigationProgress();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushParams({ search: val || undefined, page: 1 });
    }, 300);
  }

  function handleSortingChange(updater: SortingState | ((prev: SortingState) => SortingState)) {
    setLoading(true);
    triggerNavigationProgress();
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    setSorting(next);
    if (next[0]) {
      pushParams({
        sortBy: next[0].id,
        sortDir: next[0].desc ? 'desc' : 'asc',
        page: 1,
      });
    }
  }

  const FILTER_KEYS = [
    'search','claimNumber','claim_number','ticketId','ticket_id','externalId','external_id','postId','post_id',
    'firstName','first_name','lastName','last_name','email','requester','assignee',
    'claimStatus','claim_status','ticketStatus','ticket_status','dashboardStatus','dashboard_status',
    'airline','flightNumber','flight_number','departureCountry','departure_country',
    'destinationCountry','destination_country','source','eventType','event_type',
    'preferredLanguage','preferred_language','originalClaimLanguage','original_claim_language',
    'needPaymentDetails','need_payment_details','needResign','need_resign',
    'dashboardCompleted','is_dashboard_completed','whatsappNotification','whatsapp_notification',
    'multiplePassengers','multiple_passengers','acceptanceDateMandatory','acceptance_date_mandatory',
    'latestUpdateByRequester','latest_update_by_requester',
    'requestedDateFrom','requestedDateTo','solvedDateFrom','solvedDateTo',
    'scheduledDateFrom','scheduledDateTo','claimAcceptanceDateFrom','claimAcceptanceDateTo',
    'moneyReceivedDateFrom','moneyReceivedDateTo','compensationMin','compensationMax',
    'amountReceivedMin','amountReceivedMax',
  ];

  const activeFilters = Array.from(new Set(FILTER_KEYS.filter((k) => searchParams.get(k))));

  function clearAllFilters() {
    setLoading(true);
    triggerNavigationProgress();
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('pageSize', String(currentPageSize));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    setSearchInput('');
  }

  function removeFilter(key: string) {
    setLoading(true);
    triggerNavigationProgress();
    pushParams({ [key]: undefined, page: 1 });
    if (key === 'search') setSearchInput('');
  }


  const selectedIds = Object.keys(rowSelection)
    .map((idx) => data[parseInt(idx)]?.id)
    .filter(Boolean) as number[];

  const columns = create59Columns();
  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, rowSelection },
    onSortingChange: handleSortingChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: pagination.totalPages,
    enableRowSelection: true,
  });

  return (
    <div className="flex flex-col h-full gap-4 animate-fade-in select-none">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-950 tracking-tight">Claims Console</h1>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-zinc-100 border border-zinc-200 rounded text-zinc-700">
              {loading ? 'Fetching...' : `${pagination.total.toLocaleString()} Records`}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            59 Payment Team Columns available with server-side SQL pagination over 1.8M+ rows
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ExportMenu
            searchParams={searchParams}
            selectedIds={selectedIds}
          />
          <ColumnVisibilityMenu table={table} onResetDefaults={resetDefaultColumns} />
          <button
            id="open-filter-drawer"
            onClick={() => setFilterDrawerOpen(true)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md border text-xs font-semibold transition-all shadow-subtle
              ${activeFilters.length > 0
                ? 'bg-zinc-900 border-zinc-900 text-white'
                : 'bg-white border-zinc-300 text-zinc-700 hover:border-zinc-900'
              }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {activeFilters.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-zinc-950 text-[10px] flex items-center justify-center font-bold font-mono">
                {activeFilters.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          id="tickets-search"
          type="search"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by claim #, ticket ID, name, email, airline, flight, requester..."
          className="input-base pl-9 pr-8 py-2 font-medium"
        />
        {searchInput && (
          <button
            onClick={() => handleSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-950 text-xs font-mono"
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <FilterChips
          searchParams={searchParams}
          filterKeys={activeFilters}
          onRemove={removeFilter}
          onClearAll={clearAllFilters}
        />
      )}

      {/* Selection Banner */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-900 text-white rounded-md text-xs shadow-subtle">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{selectedIds.length} row{selectedIds.length !== 1 ? 's' : ''} selected</span>
          </div>
          <button
            onClick={() => setRowSelection({})}
            className="text-xs text-zinc-300 hover:text-white underline font-mono"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="card overflow-hidden flex-1 flex flex-col min-h-0 relative">
        {loading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-zinc-200 overflow-hidden z-20">
            <div className="h-full bg-zinc-950 animate-pulse w-full" />
          </div>
        )}

        <div className="overflow-x-auto overflow-y-auto flex-1">
          {error ? (
            <div className="flex items-center justify-center h-48 text-zinc-600 text-xs">
              <div className="text-center">
                <p className="text-rose-600 font-semibold">{error}</p>
                <button onClick={fetchData} className="text-zinc-900 underline font-semibold text-xs mt-2">
                  Retry fetch
                </button>
              </div>
            </div>
          ) : loading && data.length === 0 ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="skeleton h-8 rounded" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
              <svg className="w-8 h-8 mb-2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-xs font-semibold text-zinc-900">No matching claims found</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Try broadening your active search or filter criteria</p>
              {activeFilters.length > 0 && (
                <button onClick={clearAllFilters} className="text-zinc-900 text-xs font-semibold mt-2.5 underline">
                  Reset all filters
                </button>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => {
                      const canSort = header.column.getCanSort() && header.id !== 'select';
                      const sorted = header.column.getIsSorted();
                      return (
                        <th
                          key={header.id}
                          className={canSort ? 'sortable' : ''}
                          style={{ width: header.getSize() }}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        >
                          <div className="flex items-center gap-1">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {canSort && (
                              <span className="text-zinc-400 ml-0.5 font-mono text-[10px]">
                                {sorted === 'asc' ? '▲' : sorted === 'desc' ? '▼' : '↕'}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className={loading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedTicketId(row.original.id)}
                    className="cursor-pointer"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        {!error && (
          <div className="border-t border-zinc-200 p-3 bg-white">
            <Pagination
              page={currentPage}
              pageSize={currentPageSize}
              total={pagination.total}
              totalPages={pagination.totalPages}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              disabled={loading}
              onPageChange={(p) => pushParams({ page: p })}
              onPageSizeChange={(ps) => pushParams({ pageSize: ps, page: 1 })}
            />
          </div>
        )}
      </div>

      {/* Filter Drawer */}
      <FilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        filterOptions={filterOptions}
        searchParams={searchParams}
        onApply={(filters) => {
          setLoading(true);
          triggerNavigationProgress();
          const params = new URLSearchParams({ page: '1', pageSize: String(currentPageSize) });
          if (currentSearch) params.set('search', currentSearch);
          if (currentSortBy) params.set('sortBy', currentSortBy);
          if (currentSortDir) params.set('sortDir', currentSortDir);
          for (const [k, v] of Object.entries(filters)) {
            if (v !== undefined && v !== '') params.set(k, String(v));
          }
          router.push(`${pathname}?${params.toString()}`, { scroll: false });
          setFilterDrawerOpen(false);
        }}
      />


      {/* Detail Drawer */}
      {selectedTicketId !== null && (
        <DetailDrawer
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
        />
      )}
    </div>
  );
}
