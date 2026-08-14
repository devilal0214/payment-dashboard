import { NextResponse } from 'next/server';
import { getFilterOptions } from '@/lib/queries/filter-options';
import { requireAuth } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/roles';

export async function GET() {
  try {
    const user = await requireAuth();
    if (!hasPermission(user.role, 'viewList')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const options = await getFilterOptions();

    return NextResponse.json({ data: options }, {
      headers: {
        // Cache filter options for 5 minutes — they change infrequently
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[API /tickets/filter-options] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
