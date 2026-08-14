import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getFilterOptions } from '@/lib/queries/filter-options';
import TicketsPageClient from '@/components/tickets/TicketsPageClient';

export const metadata: Metadata = { title: 'Claims' };

export default async function TicketsPage() {
  // Load filter options server-side (dropdown values)
  let filterOptions = null;
  try {
    filterOptions = await getFilterOptions();
  } catch {
    // Non-critical — filters will still work with text input
  }

  return (
    <Suspense fallback={
      <div className="space-y-4">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-10 rounded" />
        <div className="card p-4 space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton h-8 rounded" />
          ))}
        </div>
      </div>
    }>
      <TicketsPageClient filterOptions={filterOptions} />
    </Suspense>
  );
}
