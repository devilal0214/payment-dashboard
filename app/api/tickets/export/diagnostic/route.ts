import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { runExportDiagnostic } from '@/lib/export/export-diagnostics';

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const report = await runExportDiagnostic();
    return NextResponse.json(report, {
      status: report.status === 'ok' ? 200 : 500,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[Export Diagnostic Error]:', err);
    return NextResponse.json(
      {
        status: 'error',
        error: err instanceof Error ? err.message : 'Diagnostic execution failed',
      },
      { status: 500 }
    );
  }
}
