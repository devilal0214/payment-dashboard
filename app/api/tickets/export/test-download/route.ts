import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { requireAuth } from '@/lib/auth/session';
import { createZipArchive } from '@/lib/export/zip-helper';

const EXPORT_TMP_DIR = process.env.EXPORT_TMP_DIR || path.join(process.cwd(), 'tmp', 'exports');

function nodeStreamToWebStream(nodeStream: fs.ReadStream): ReadableStream {
  if (typeof Readable.toWeb === 'function') {
    return Readable.toWeb(nodeStream) as ReadableStream;
  }
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => {
        controller.enqueue(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      });
      nodeStream.on('end', () => controller.close());
      nodeStream.on('error', (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

export async function GET() {
  const testZipPath = path.join(EXPORT_TMP_DIR, `test-dl-${Date.now()}.zip`);
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!fs.existsSync(/*turbopackIgnore: true*/ EXPORT_TMP_DIR)) {
      fs.mkdirSync(/*turbopackIgnore: true*/ EXPORT_TMP_DIR, { recursive: true });
    }

    // Generate a tiny valid 1KB test ZIP using safe factory
    const output = fs.createWriteStream(testZipPath);
    const archive = createZipArchive({ zlib: { level: 1 } });

    const zipPromise = new Promise<void>((resolve, reject) => {
      output.on('close', () => resolve());
      output.on('finish', () => resolve());
      output.on('error', (e: Error) => reject(e));
      archive.on('error', (e: Error) => reject(e));
    });

    archive.append('ReFly Payment Export Download Test Sample Data\nStatus: OK\n', { name: 'readme.txt' });
    archive.pipe(output);
    await archive.finalize();
    await zipPromise;

    const fileSize = fs.statSync(testZipPath).size;
    const nodeStream = fs.createReadStream(testZipPath);
    const webStream = nodeStreamToWebStream(nodeStream);

    // Auto-delete temporary test file after 15 seconds
    setTimeout(() => {
      try { if (fs.existsSync(testZipPath)) fs.unlinkSync(testZipPath); } catch { /* ignore */ }
    }, 15000);

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="refly-test-download.zip"',
        'Content-Length': String(fileSize),
        'Cache-Control': 'private, no-cache, no-store',
      },
    });

  } catch (err) {
    try { if (fs.existsSync(testZipPath)) fs.unlinkSync(testZipPath); } catch { /* ignore */ }
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[API /tickets/export/test-download] Error:', err);
    return NextResponse.json({ error: 'Test download failed' }, { status: 500 });
  }
}
