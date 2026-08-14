import { NextRequest, NextResponse } from 'next/server';
import { ticketListQuerySchema } from '@/lib/validation/tickets.schema';
import { getDashboardStats } from '@/lib/queries/stats';
import { requireAuth } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/roles';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!hasPermission(user.role, 'viewList')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    // Parse filters (ignore pagination params for stats)
    const parsed = ticketListQuerySchema.safeParse(searchParams);
    const filters = parsed.success ? parsed.data : {};

    const stats = await getDashboardStats(filters);

    return NextResponse.json({ data: stats }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[API /tickets/stats] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
