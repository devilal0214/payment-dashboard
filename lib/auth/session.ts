/**
 * lib/auth/session.ts
 *
 * iron-session v8 configuration and helpers.
 * Session is stored in an encrypted HTTP-only cookie.
 */
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import type { Role } from './roles';

export interface SessionUser {
  id: number;
  username: string;
  role: Role;
}

export interface SessionData {
  user?: SessionUser;
}

export const SESSION_OPTIONS = {
  cookieName: 'refly_reports_session',
  password: process.env.SESSION_SECRET as string,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  },
} as const;

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, SESSION_OPTIONS);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const session = await getSession();
    return session.user ?? null;
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
