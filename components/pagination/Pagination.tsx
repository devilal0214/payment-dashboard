'use client';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export default function Pagination({
  page, pageSize, total, totalPages, pageSizeOptions,
  onPageChange, onPageSizeChange,
}: PaginationProps) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap text-xs text-text-secondary">
      {/* Record count */}
      <span>
        Showing <span className="font-medium text-text-primary">{from.toLocaleString()}–{to.toLocaleString()}</span>{' '}
        of <span className="font-medium text-text-primary">{total.toLocaleString()}</span> records
      </span>

      {/* Page navigation */}
      <div className="flex items-center gap-1">
        {/* First */}
        <button
          id="pagination-first"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          className="px-2 py-1 rounded border border-border bg-surface-3 hover:bg-surface-4 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="First page"
        >
          «
        </button>

        {/* Prev */}
        <button
          id="pagination-prev"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-2 py-1 rounded border border-border bg-surface-3 hover:bg-surface-4 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Previous page"
        >
          ‹
        </button>

        {/* Page numbers */}
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
              className={`w-7 h-7 rounded border text-xs transition-colors ${
                p === page
                  ? 'bg-brand-600 border-brand-600 text-white font-semibold'
                  : 'border-border bg-surface-3 hover:bg-surface-4 text-text-secondary'
              }`}
            >
              {p}
            </button>
          );
        })}

        {/* Next */}
        <button
          id="pagination-next"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-2 py-1 rounded border border-border bg-surface-3 hover:bg-surface-4 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Next page"
        >
          ›
        </button>

        {/* Last */}
        <button
          id="pagination-last"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className="px-2 py-1 rounded border border-border bg-surface-3 hover:bg-surface-4 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Last page"
        >
          »
        </button>
      </div>

      {/* Page size */}
      <div className="flex items-center gap-2">
        <span>Rows:</span>
        <select
          id="pagination-page-size"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="bg-surface-3 border border-border rounded px-2 py-1 text-xs text-text-primary outline-none focus:border-brand-500"
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
