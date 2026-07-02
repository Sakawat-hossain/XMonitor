import { NextRequest, NextResponse } from 'next/server';

const TOKEN_COOKIE = 'xmonitor_token';

// Server-side gate for the admin panel. Presence-only check — the token
// signature is verified by the backend on every API call; this just keeps
// logged-out visitors from ever seeing admin page shells.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = Boolean(request.cookies.get(TOKEN_COOKIE)?.value);

  // Already logged in? Skip the login page.
  if (pathname === '/admin/login') {
    if (hasToken) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  if (!hasToken) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/admin'],
};
