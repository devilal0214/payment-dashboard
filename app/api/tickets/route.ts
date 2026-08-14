import { NextRequest, NextResponse } from 'next/server';
import { ticketListQuerySchema } from '@/lib/validation/tickets.schema';
import { getTickets } from '@/lib/queries/tickets';
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

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await getTickets(parsed.data);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[API /tickets] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
