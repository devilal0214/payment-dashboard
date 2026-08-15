import { NextResponse } from 'next/server';
import { runExportHealthCheck } from '@/lib/export/export-diagnostics';

export async function GET() {
  try {
    const health = await runExportHealthCheck();
    return NextResponse.json(health, {
      status: health.status === 'ok' ? 200 : 500,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        error: err instanceof Error ? err.message : 'Health check failed',
      },
      { status: 500 }
    );
  }
}
