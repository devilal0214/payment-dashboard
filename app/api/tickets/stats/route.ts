import { NextRequest, NextResponse } from 'next/server';
import { ticketListQuerySchema } from '@/lib/validation/tickets.schema';
import { getDashboardData } from '@/lib/queries/stats';
import { requireAuth } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/roles';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!hasPermission(user.role, 'viewList')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = ticketListQuerySchema.safeParse(searchParams);
    const filters = parsed.success ? parsed.data : {};

    const fullData = await getDashboardData(filters);

    return NextResponse.json(
      {
        data: fullData.stats,
        stats: fullData.stats,
        charts: fullData.charts,
        freshness: fullData.freshness,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[API /tickets/stats] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
