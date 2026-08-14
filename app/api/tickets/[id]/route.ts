import { NextRequest, NextResponse } from 'next/server';
import { getTicketById } from '@/lib/queries/tickets';
import { requireAuth } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/roles';
import { auditLog, createAuditEntry } from '@/lib/audit/log';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    if (!hasPermission(user.role, 'viewDetail')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const ticket = await getTicketById(numId);

    if (!ticket) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Audit the view
    auditLog(createAuditEntry('ticket_view', user, { resourceId: numId }));

    // Strip raw JSON fields for non-admin roles
    let result = { ...ticket };
    if (!hasPermission(user.role, 'viewRawJson')) {
      auditLog(createAuditEntry('raw_data_access', user, {
        details: { blocked: true, resourceId: numId },
      }));
      delete result.payload_json;
      delete result.previous_meta_json;
      delete result.zendesk_payload_json;
    } else {
      auditLog(createAuditEntry('raw_data_access', user, {
        details: { allowed: true, resourceId: numId },
      }));
    }

    // Strip sensitive fields for viewer role
    if (!hasPermission(user.role, 'viewSensitive')) {
      delete result.passport;
      delete result.signature;
      delete result.documents;
      delete result.boarding_pass;
      delete result.payment_info;
      delete result.address;
      delete result.phone_number;
      delete result.email;
    }

    return NextResponse.json({ data: result }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[API /tickets/[id]] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
