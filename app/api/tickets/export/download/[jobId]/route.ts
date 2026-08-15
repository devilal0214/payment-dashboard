import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { Readable } from 'stream';
import { requireAuth } from '@/lib/auth/session';
import { getJobMeta } from '@/lib/export/export-job-manager';

/**
 * Converts a Node.js fs.ReadStream to a Web Standard ReadableStream
 * without premature stream closure or destination stream errors.
 */
function nodeStreamToWebStream(nodeStream: fs.ReadStream): ReadableStream {
  if (typeof Readable.toWeb === 'function') {
    return Readable.toWeb(nodeStream) as ReadableStream;
  }
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => {
        controller.enqueue(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      });
      nodeStream.on('end', () => {
        controller.close();
      });
      nodeStream.on('error', (err) => {
        controller.error(err);
      });
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

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

    const fileSize = job.fileSizeBytes || fs.statSync(job.zipFilePath).size;
    if (fileSize === 0) {
      return NextResponse.json({ error: 'Export file is empty' }, { status: 500 });
    }

    const nodeStream = fs.createReadStream(job.zipFilePath);
    nodeStream.on('error', (err) => {
      console.error(`[DownloadStream ${jobId}] Error:`, err);
    });

    const webStream = nodeStreamToWebStream(nodeStream);
    const contentType = job.format === 'csv' ? 'text/csv; charset=utf-8' : 'application/zip';

    // Stream download with Web Standard ReadableStream and attachment disposition
    return new NextResponse(webStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${job.zipFilename}"`,
        'Content-Length': String(fileSize),
        'Cache-Control': 'private, no-cache, no-store',
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
