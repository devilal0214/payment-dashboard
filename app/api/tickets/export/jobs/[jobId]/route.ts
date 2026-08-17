import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getJobMeta } from '@/lib/export/export-job-manager';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const traceId = req.headers.get('x-export-trace-id') || 'untraced';
  const { jobId } = await params;

  try {
    const user = await requireAuth();
    if (!user) {
      console.log(`[EXPORT UI traceId=${traceId}] POLL jobId=${jobId} status=401 error=Unauthorized`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const job = await getJobMeta(jobId, user.username);
    if (!job) {
      console.log(`[EXPORT UI traceId=${traceId}] POLL jobId=${jobId} status=404 error=NotFound`);
      return NextResponse.json({ error: 'Export job not found or access denied', jobId }, { status: 404 });
    }

    console.log(`[EXPORT UI traceId=${traceId}] POLL jobId=${jobId} status=200 jobStatus=${job.status} stage=${job.stage} processed=${job.processedRows}/${job.totalRows}`);

    return NextResponse.json(job, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      console.log(`[EXPORT UI traceId=${traceId}] POLL jobId=${jobId} status=401 error=Unauthorized`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error(`[EXPORT UI traceId=${traceId}] POLL jobId=${jobId} status=500 error=InternalServerError`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
