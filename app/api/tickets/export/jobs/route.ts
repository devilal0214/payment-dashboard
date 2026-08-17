import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/roles';
import { createExportJob } from '@/lib/export/export-job-manager';

export async function POST(req: NextRequest) {
  const traceId = req.headers.get('x-export-trace-id') || 'untraced';
  console.log(`[EXPORT UI traceId=${traceId}] POST start`);

  try {
    const user = await requireAuth();
    if (!hasPermission(user.role, 'exportBasic')) {
      console.log(`[EXPORT UI traceId=${traceId}] POST response status=403 error=Forbidden`);
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions for export' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const format = body.format === 'csv' ? 'csv' : 'xlsx';
    const queryParams = body.filters || {};
    const selectedIds = Array.isArray(body.selectedIds) ? body.selectedIds.map(Number) : undefined;

    const job = await createExportJob(user.username, queryParams, format, selectedIds);

    console.log(`[EXPORT UI traceId=${traceId}] POST response status=200 jobId=${job.jobId} totalRows=${job.totalRows}`);

    return NextResponse.json({
      jobId: job.jobId,
      status: job.status,
      totalRows: job.totalRows,
      format: job.format,
      createdAt: job.createdAt,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    if (errMsg === 'Unauthorized') {
      console.log(`[EXPORT UI traceId=${traceId}] POST response status=401 error=Unauthorized`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errMsg.includes('disk space')) {
      console.log(`[EXPORT UI traceId=${traceId}] POST response status=507 error="${errMsg}"`);
      return NextResponse.json({ error: errMsg }, { status: 507 });
    }
    console.error(`[EXPORT UI traceId=${traceId}] POST response status=400 error="${errMsg}"`);
    return NextResponse.json({ error: errMsg }, { status: 400 });
  }
}
