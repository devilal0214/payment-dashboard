import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { loginSchema } from '@/lib/validation/auth.schema';
import { getSession } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';
import { auditLog, createAuditEntry } from '@/lib/audit/log';
import type { Role } from '@/lib/auth/roles';

interface DbUser {
  id: number;
  username: string;
  password_hash: string;
  role: Role;
  is_active: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { username, password } = parsed.data;

    const users = await query<DbUser>(
      `SELECT id, username, password_hash, role, is_active
       FROM users
       WHERE username = ?
       LIMIT 1`,
      [username],
    );

    const user = users[0];
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';

    if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash))) {
      auditLog(createAuditEntry('login_failed', null, {
        details: { username },
        ip,
      }));
      // Consistent timing to prevent user enumeration
      await new Promise((r) => setTimeout(r, 300));
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const session = await getSession();
    session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    };
    await session.save();

    auditLog(createAuditEntry('login', { id: user.id, username: user.username, role: user.role }, { ip }));

    return NextResponse.json({
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
