import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { requireAuth } from '@/lib/auth/session';
import { getJobMeta } from '@/lib/export/export-job-manager';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await requireAuth();
    const { jobId } = await params;

    const job = getJobMeta(jobId, user.username);
    if (!job || job.status !== 'completed' || !job.zipFilePath) {
      return NextResponse.json({ error: 'Export file not ready or not found' }, { status: 404 });
    }

    if (!fs.existsSync(job.zipFilePath)) {
      return NextResponse.json({ error: 'Export file expired or deleted' }, { status: 410 });
    }

    const fileStream = fs.createReadStream(job.zipFilePath);
    const contentType = job.format === 'csv' ? 'text/csv' : 'application/zip';

    // Return file stream with proper download headers
    return new NextResponse(fileStream as unknown as ReadableStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${job.zipFilename}"`,
        'Content-Length': String(job.fileSizeBytes || fs.statSync(job.zipFilePath).size),
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[API /tickets/export/download] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
