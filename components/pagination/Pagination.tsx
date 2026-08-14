'use client';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  disabled?: boolean;
}

export default function Pagination({
  page, pageSize, total, totalPages, pageSizeOptions,
  onPageChange, onPageSizeChange, disabled = false,
}: PaginationProps) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap text-xs text-zinc-600 select-none">
      {/* Record count */}
      <span className="font-mono">
        Showing <span className="font-bold text-zinc-950">{total > 0 ? from.toLocaleString() : 0}–{to.toLocaleString()}</span>{' '}
        of <span className="font-bold text-zinc-950">{total.toLocaleString()}</span> records
      </span>

      {/* Page navigation */}
      <div className="flex items-center gap-1 font-mono">
        <button
          id="pagination-first"
          onClick={() => onPageChange(1)}
          disabled={disabled || page <= 1}
          className="px-2 py-1 rounded border border-zinc-200 bg-white hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-zinc-800"
          title="First page"
        >
          «
        </button>

        <button
          id="pagination-prev"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          className="px-2 py-1 rounded border border-zinc-200 bg-white hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-zinc-800"
          title="Previous page"
        >
          ‹
        </button>

        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p: number;
          if (totalPages <= 5) {
            p = i + 1;
          } else if (page <= 3) {
            p = i + 1;
          } else if (page >= totalPages - 2) {
            p = totalPages - 4 + i;
          } else {
            p = page - 2 + i;
          }
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              disabled={disabled}
              className={`w-7 h-7 rounded border text-xs font-mono font-semibold transition-all ${
                p === page
                  ? 'bg-zinc-950 border-zinc-950 text-white'
                  : 'border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-800'
              }`}
            >
              {p}
            </button>
          );
        })}

        <button
          id="pagination-next"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
          className="px-2 py-1 rounded border border-zinc-200 bg-white hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-zinc-800"
          title="Next page"
        >
          ›
        </button>

        <button
          id="pagination-last"
          onClick={() => onPageChange(totalPages)}
          disabled={disabled || page >= totalPages}
          className="px-2 py-1 rounded border border-zinc-200 bg-white hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-zinc-800"
          title="Last page"
        >
          »
        </button>
      </div>

      {/* Page size */}
      <div className="flex items-center gap-2 font-mono">
        <span className="text-zinc-500">Rows per page:</span>
        <select
          id="pagination-page-size"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          disabled={disabled}
          className="bg-white border border-zinc-300 rounded px-2 py-1 text-xs font-mono font-bold text-zinc-900 outline-none focus:border-zinc-900"
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
