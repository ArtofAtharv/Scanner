import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const authRole = request.cookies.get('auth_role')?.value;
  const path = request.nextUrl.pathname;

  if (path.startsWith('/dashboard')) {
    if (authRole !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  if (path.startsWith('/scan')) {
    if (authRole !== 'admin' && authRole !== 'scanner') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/scan/:path*'],
}
