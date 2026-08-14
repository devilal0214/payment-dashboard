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
import StatusBadge from './StatusBadge';
import BooleanBadge from './BooleanBadge';
import ColumnVisibilityMenu from './ColumnVisibilityMenu';
import FilterDrawer from '@/components/filters/FilterDrawer';
import FilterChips from '@/components/filters/FilterChips';
import Pagination from '@/components/pagination/Pagination';
import ExportMenu from '@/components/export/ExportMenu';
import DetailDrawer from '@/components/detail/DetailDrawer';

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

// ─── Column definitions ────────────────────────────────────────────────────────
function createColumns(): ColumnDef<TicketRow>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="rounded border-border bg-surface-3 text-brand-500"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="rounded border-border bg-surface-3 text-brand-500"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      size: 36,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'claim_number',
      header: 'Claim #',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-brand-300">{String(getValue() ?? '—')}</span>
      ),
    },
    {
      accessorKey: 'claim_status',
      header: 'Claim Status',
      cell: ({ getValue }) => <StatusBadge type="claim" value={String(getValue() ?? '')} />,
    },
    {
      accessorKey: 'first_name',
      header: 'First Name',
      cell: ({ getValue }) => <span className="text-xs">{String(getValue() ?? '—')}</span>,
    },
    {
      accessorKey: 'last_name',
      header: 'Last Name',
      cell: ({ getValue }) => <span className="text-xs">{String(getValue() ?? '—')}</span>,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ getValue }) => (
        <span className="text-xs text-text-secondary truncate max-w-[180px] block">
          {String(getValue() ?? '—')}
        </span>
      ),
    },
    {
      accessorKey: 'airline',
      header: 'Airline',
      cell: ({ getValue }) => <span className="text-xs">{String(getValue() ?? '—')}</span>,
    },
    {
      accessorKey: 'flight_number',
      header: 'Flight #',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs">{String(getValue() ?? '—')}</span>
      ),
    },
    {
      accessorKey: 'scheduled_date',
      header: 'Scheduled',
      cell: ({ getValue }) => (
        <span className="text-xs text-text-secondary">
          {getValue() ? String(getValue()).slice(0, 10) : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'departure_airport_iata',
      header: 'Dep.',
      cell: ({ row }) => (
        <span className="text-xs font-mono">
          {row.original.departure_airport_iata || row.original.departure_airport || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'destination_airport_iata',
      header: 'Dest.',
      cell: ({ row }) => (
        <span className="text-xs font-mono">
          {row.original.destination_airport_iata || row.original.destination_airport || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'compensation_amount',
      header: 'Compensation',
      cell: ({ getValue }) => {
        const v = getValue();
        return (
          <span className="text-xs font-medium text-teal-400">
            {v != null ? `€${Number(v).toLocaleString()}` : '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'amount_received',
      header: 'Received',
      cell: ({ getValue }) => {
        const v = getValue();
        return (
          <span className="text-xs font-medium text-green-400">
            {v != null ? `€${Number(v).toLocaleString()}` : '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'need_payment_details',
      header: 'Pay. Details',
      cell: ({ getValue }) => <BooleanBadge value={!!getValue()} trueLabel="Needed" falseLabel="OK" />,
    },
    {
      accessorKey: 'need_resign',
      header: 'Re-sign',
      cell: ({ getValue }) => <BooleanBadge value={!!getValue()} trueLabel="Needed" falseLabel="OK" />,
    },
    {
      accessorKey: 'dashboard_status',
      header: 'Dashboard',
      cell: ({ getValue }) => <StatusBadge type="dashboard" value={String(getValue() ?? '')} />,
    },
    {
      accessorKey: 'ticket_status',
      header: 'Ticket Status',
      cell: ({ getValue }) => <StatusBadge type="ticket" value={String(getValue() ?? '')} />,
    },
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ getValue }) => <StatusBadge type="source" value={String(getValue() ?? '')} />,
    },
    {
      accessorKey: 'updated_at',
      header: 'Updated',
      cell: ({ getValue }) => (
        <span className="text-xs text-text-muted">
          {getValue() ? String(getValue()).slice(0, 16).replace('T', ' ') : '—'}
        </span>
      ),
    },
  ];
}

export default function TicketsPageClient({ filterOptions }: TicketsPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ─── URL state ──────────────────────────────────────────────────────────────
  const getParam = useCallback((key: string) => searchParams.get(key) ?? '', [searchParams]);

  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentPageSize = parseInt(searchParams.get('pageSize') || '25', 10);
  const currentSearch = searchParams.get('search') || '';
  const currentSortBy = searchParams.get('sortBy') || 'updated_at';
  const currentSortDir = (searchParams.get('sortDir') || 'desc') as 'asc' | 'desc';

  // ─── Local state ────────────────────────────────────────────────────────────
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
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [sorting, setSorting] = useState<SortingState>([
    { id: currentSortBy, desc: currentSortDir === 'desc' },
  ]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Build current URL params ────────────────────────────────────────────────
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
    const params = buildParams(overrides);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  // ─── Fetch data ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/tickets?${searchParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json.data ?? []);
      setPagination(json.pagination);
    } catch (e) {
      setError('Failed to load claims. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Search debounce ─────────────────────────────────────────────────────────
  function handleSearchChange(val: string) {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushParams({ search: val || undefined, page: 1 });
    }, 400);
  }

  // ─── Sorting ─────────────────────────────────────────────────────────────────
  function handleSortingChange(updater: SortingState | ((prev: SortingState) => SortingState)) {
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

  // ─── Active filters (non-pagination params) ─────────────────────────────────
  const FILTER_KEYS = [
    'search','claimNumber','ticketId','postId','firstName','lastName','email',
    'requester','assignee','claimStatus','ticketStatus','dashboardStatus',
    'airline','flightNumber','departureCountry','destinationCountry','source',
    'eventType','preferredLanguage','originalClaimLanguage',
    'needPaymentDetails','needResign','dashboardCompleted','whatsappNotification',
    'multiplePassengers','acceptanceDateMandatory',
    'requestedDateFrom','requestedDateTo','solvedDateFrom','solvedDateTo',
    'scheduledDateFrom','scheduledDateTo',
    'claimAcceptanceDateFrom','claimAcceptanceDateTo',
    'moneyReceivedDateFrom','moneyReceivedDateTo',
    'compensationMin','compensationMax','amountReceivedMin','amountReceivedMax',
  ];

  const activeFilters = FILTER_KEYS.filter((k) => searchParams.get(k));

  function clearAllFilters() {
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('pageSize', String(currentPageSize));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    setSearchInput('');
  }

  function removeFilter(key: string) {
    pushParams({ [key]: undefined, page: 1 });
    if (key === 'search') setSearchInput('');
  }

  // ─── Selected row IDs ────────────────────────────────────────────────────────
  const selectedIds = Object.keys(rowSelection)
    .map((idx) => data[parseInt(idx)]?.id)
    .filter(Boolean) as number[];

  // ─── TanStack Table ──────────────────────────────────────────────────────────
  const columns = createColumns();
  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, rowSelection },
    onSortingChange: handleSortingChange,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: pagination.totalPages,
    enableRowSelection: true,
  });

  return (
    <div className="flex flex-col h-full gap-4 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Claims</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            {loading ? 'Loading…' : `${pagination.total.toLocaleString()} total records`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ExportMenu
            searchParams={searchParams}
            selectedIds={selectedIds}
          />
          <ColumnVisibilityMenu table={table} />
          <button
            id="open-filter-drawer"
            onClick={() => setFilterDrawerOpen(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors
              ${activeFilters.length > 0
                ? 'bg-brand-600/20 border-brand-500/40 text-brand-300'
                : 'bg-surface-3 border-border text-text-secondary hover:text-text-primary'
              }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {activeFilters.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center font-semibold">
                {activeFilters.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Search bar ─────────────────────────────────────── */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          id="tickets-search"
          type="search"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by claim #, ticket ID, name, email, airline, flight…"
          className="input-base pl-9 pr-4"
        />
      </div>

      {/* ── Active filter chips ─────────────────────────────── */}
      {activeFilters.length > 0 && (
        <FilterChips
          searchParams={searchParams}
          filterKeys={activeFilters}
          onRemove={removeFilter}
          onClearAll={clearAllFilters}
        />
      )}

      {/* ── Selection indicator ─────────────────────────────── */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-brand-600/15 border border-brand-500/30 rounded-lg">
          <span className="text-xs text-brand-300 font-medium">
            {selectedIds.length} row{selectedIds.length !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => setRowSelection({})}
            className="text-xs text-text-muted hover:text-text-primary"
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────── */}
      <div className="card overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          {error ? (
            <div className="flex items-center justify-center h-40 text-text-secondary text-sm">
              <div className="text-center">
                <p className="text-red-400 font-medium">{error}</p>
                <button onClick={fetchData} className="text-brand-400 text-xs mt-2 hover:underline">
                  Retry
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="skeleton h-8 rounded" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-text-secondary">
              <svg className="w-10 h-10 mb-3 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm font-medium text-text-secondary">No claims found</p>
              <p className="text-xs text-text-muted mt-1">Try adjusting your filters or search</p>
              {activeFilters.length > 0 && (
                <button onClick={clearAllFilters} className="text-brand-400 text-xs mt-3 hover:underline">
                  Clear all filters
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
                              <span className="text-text-muted ml-0.5">
                                {sorted === 'asc' ? ' ↑' : sorted === 'desc' ? ' ↓' : ' ↕'}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
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

        {/* ── Pagination ──────────────────────────────────── */}
        {!loading && !error && data.length > 0 && (
          <div className="border-t border-border p-3">
            <Pagination
              page={currentPage}
              pageSize={currentPageSize}
              total={pagination.total}
              totalPages={pagination.totalPages}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={(p) => pushParams({ page: p })}
              onPageSizeChange={(ps) => pushParams({ pageSize: ps, page: 1 })}
            />
          </div>
        )}
      </div>

      {/* ── Filter drawer ────────────────────────────────── */}
      <FilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        filterOptions={filterOptions}
        searchParams={searchParams}
        onApply={(filters) => {
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

      {/* ── Detail drawer ────────────────────────────────── */}
      {selectedTicketId !== null && (
        <DetailDrawer
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
        />
      )}
    </div>
  );
}
