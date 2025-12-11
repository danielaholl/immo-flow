import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Skip middleware for pages - let client-side handle auth redirects
  // Only run middleware for API routes to forward auth tokens
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

  if (!isApiRoute) {
    return NextResponse.next();
  }

  // Simply pass through - the tRPC proxy route already forwards the auth token
  // to the Express API server which handles JWT verification
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Only run middleware for API routes
    '/api/:path*',
  ],
};
