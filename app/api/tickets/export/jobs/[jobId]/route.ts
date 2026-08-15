import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getJobMeta } from '@/lib/export/export-job-manager';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await params;
    const job = getJobMeta(jobId, user.username);

    if (!job) {
      return NextResponse.json({ error: 'Export job not found or access denied', jobId }, { status: 404 });
    }

    return NextResponse.json(job, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
