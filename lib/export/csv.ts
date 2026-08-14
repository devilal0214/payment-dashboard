/**
 * lib/export/csv.ts
 *
 * Server-side CSV generation via streaming batches.
 * Returns a ReadableStream suitable for Next.js Response.
 */
import type { TicketListQuery } from '@/lib/validation/tickets.schema';
import { getTicketsForExport } from '@/lib/queries/tickets';

const DEFAULT_EXPORT_COLUMNS = [
  { header: 'Claim Number', key: 'claim_number' },
  { header: 'Claim Status', key: 'claim_status' },
  { header: 'First Name', key: 'first_name' },
  { header: 'Last Name', key: 'last_name' },
  { header: 'Email', key: 'email' },
  { header: 'Phone', key: 'phone_number' },
  { header: 'Airline', key: 'airline' },
  { header: 'Flight Number', key: 'flight_number' },
  { header: 'Scheduled Date', key: 'scheduled_date' },
  { header: 'Departure Airport', key: 'departure_airport' },
  { header: 'Destination Airport', key: 'destination_airport' },
  { header: 'Compensation Amount', key: 'compensation_amount' },
  { header: 'Amount Received', key: 'amount_received' },
  { header: 'Dashboard Status', key: 'dashboard_status' },
  { header: 'Need Payment Details', key: 'need_payment_details' },
  { header: 'Need Resign', key: 'need_resign' },
  { header: 'Source', key: 'source' },
  { header: 'Ticket Status', key: 'ticket_status' },
  { header: 'Assignee', key: 'assignee' },
  { header: 'Updated At', key: 'updated_at' },
];

function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function generateCsvStream(
  filters: Partial<TicketListQuery>,
  includeAdvanced: boolean,
  selectedIds?: number[],
): Promise<ReadableStream<Uint8Array>> {
  const columns = DEFAULT_EXPORT_COLUMNS;

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // BOM for Excel UTF-8 compatibility
      controller.enqueue(encoder.encode('\uFEFF'));

      // Header row
      const header = columns.map((c) => escapeCsvValue(c.header)).join(',') + '\r\n';
      controller.enqueue(encoder.encode(header));

      const generator = await getTicketsForExport(filters, includeAdvanced, selectedIds);

      for await (const batch of generator) {
        for (const row of batch) {
          const line = columns.map((c) => escapeCsvValue(row[c.key])).join(',') + '\r\n';
          controller.enqueue(encoder.encode(line));
        }
      }

      controller.close();
    },
  });

  return stream;
}
