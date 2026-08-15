import { NextRequest, NextResponse } from 'next/server';
import { ticketExportQuerySchema } from '@/lib/validation/tickets.schema';
import { requireAuth } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/roles';
import { auditLog, createAuditEntry } from '@/lib/audit/log';
import { generateCsvStream } from '@/lib/export/csv';
import { generateXlsxBuffer } from '@/lib/export/xlsx';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!hasPermission(user.role, 'exportBasic')) {
      return NextResponse.json({ error: 'Forbidden: export requires payment_agent role or higher' }, { status: 403 });
    }

    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = ticketExportQuerySchema.safeParse(searchParams);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const q = parsed.data;

    // Advanced fields require admin
    const includeAdvanced = !!(q.includeAdvanced && hasPermission(user.role, 'exportAdvanced'));

    // Parse selected IDs if provided
    let selectedIds: number[] | undefined;
    if (q.selectedIds) {
      selectedIds = q.selectedIds
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));
    }

    // Audit the export
    auditLog(createAuditEntry('export', user, {
      details: {
        format: q.format,
        includeAdvanced,
        selectedIds: selectedIds?.length,
        filters: { ...q, selectedIds: undefined },
      },
      ip: req.headers.get('x-forwarded-for') ?? 'unknown',
    }));

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `refly-claims-${timestamp}`;

    if (q.format === 'xlsx') {
      const buffer = await generateXlsxBuffer(q, includeAdvanced, selectedIds);

      return new Response(buffer.buffer as ArrayBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
          'Cache-Control': 'no-store',
          'X-Export-Format': 'xlsx',
        },
      });
    }

    // Default: CSV stream
    const stream = await generateCsvStream(q, includeAdvanced, selectedIds);

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
        'Cache-Control': 'no-store',
        'X-Export-Format': 'csv',
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[API /tickets/export] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
