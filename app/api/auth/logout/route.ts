import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { auditLog, createAuditEntry } from '@/lib/audit/log';

export async function POST() {
  try {
    const session = await getSession();
    const user = session.user;
    auditLog(createAuditEntry('logout', user ?? null));
    session.destroy();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
