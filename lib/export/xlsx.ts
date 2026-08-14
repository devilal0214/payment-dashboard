/**
 * lib/export/xlsx.ts
 *
 * Server-side XLSX generation using exceljs.
 * Processes records in batches, streams into workbook buffer.
 */
import ExcelJS from 'exceljs';
import type { TicketListQuery } from '@/lib/validation/tickets.schema';
import { getTicketsForExport } from '@/lib/queries/tickets';

const EXPORT_COLUMNS = [
  { header: 'Claim Number', key: 'claim_number', width: 18 },
  { header: 'Claim Status', key: 'claim_status', width: 16 },
  { header: 'First Name', key: 'first_name', width: 15 },
  { header: 'Last Name', key: 'last_name', width: 15 },
  { header: 'Email', key: 'email', width: 28 },
  { header: 'Phone', key: 'phone_number', width: 18 },
  { header: 'Airline', key: 'airline', width: 20 },
  { header: 'Flight Number', key: 'flight_number', width: 15 },
  { header: 'Scheduled Date', key: 'scheduled_date', width: 16 },
  { header: 'Departure Airport', key: 'departure_airport', width: 22 },
  { header: 'Destination Airport', key: 'destination_airport', width: 22 },
  { header: 'Compensation Amount', key: 'compensation_amount', width: 20 },
  { header: 'Amount Received', key: 'amount_received', width: 18 },
  { header: 'Dashboard Status', key: 'dashboard_status', width: 18 },
  { header: 'Need Payment Details', key: 'need_payment_details', width: 20 },
  { header: 'Need Resign', key: 'need_resign', width: 14 },
  { header: 'Source', key: 'source', width: 14 },
  { header: 'Ticket Status', key: 'ticket_status', width: 16 },
  { header: 'Assignee', key: 'assignee', width: 22 },
  { header: 'Updated At', key: 'updated_at', width: 20 },
];

export async function generateXlsxBuffer(
  filters: Partial<TicketListQuery>,
  includeAdvanced: boolean,
  selectedIds?: number[],
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ReFly Payment Dashboard';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Claims', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = EXPORT_COLUMNS;

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  const generator = await getTicketsForExport(filters, includeAdvanced, selectedIds);

  let rowIndex = 2;
  for await (const batch of generator) {
    for (const row of batch) {
      const rowData: Record<string, unknown> = {};
      for (const col of EXPORT_COLUMNS) {
        const val = row[col.key];
        // Convert booleans
        if (col.key === 'need_payment_details' || col.key === 'need_resign') {
          rowData[col.key] = val ? 'Yes' : 'No';
        } else {
          rowData[col.key] = val ?? '';
        }
      }
      sheet.addRow(rowData);

      // Alternate row shading every 2 rows
      if (rowIndex % 2 === 0) {
        const dataRow = sheet.getRow(rowIndex);
        dataRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F0FF' },
        };
      }
      rowIndex++;
    }
  }

  // Auto-filter
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: EXPORT_COLUMNS.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
