import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/roles';
import { createExportJob } from '@/lib/export/export-job-manager';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!hasPermission(user.role, 'exportBasic')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions for export' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const format = body.format === 'csv' ? 'csv' : 'xlsx';
    const queryParams = body.filters || {};
    const selectedIds = Array.isArray(body.selectedIds) ? body.selectedIds.map(Number) : undefined;

    const job = await createExportJob(user.username, queryParams, format, selectedIds);

    return NextResponse.json({
      jobId: job.jobId,
      status: job.status,
      totalRows: job.totalRows,
      format: job.format,
      createdAt: job.createdAt,
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (err.message.includes('disk space')) {
        return NextResponse.json({ error: err.message }, { status: 507 });
      }
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('[API /tickets/export/jobs POST] Error:', err);
    return NextResponse.json({ error: 'Failed to initiate export job' }, { status: 500 });
  }
}
