import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import type { SessionData } from '@/lib/auth/session';

const SESSION_OPTIONS = {
  cookieName: 'refly_reports_session',
  password: process.env.SESSION_SECRET as string,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
  },
} as const;

// Public paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/health'];

async function handler(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow Next.js internals and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // In proxy/middleware we use the Request/Response variant of iron-session
  const res = NextResponse.next();
  let session: SessionData = {};

  try {
    session = await getIronSession<SessionData>(req, res, SESSION_OPTIONS);
  } catch {
    // Invalid or missing session cookie
  }

  if (!session.user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

// Next.js 16 requires the exported function to be named "proxy"
export const proxy = handler;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
