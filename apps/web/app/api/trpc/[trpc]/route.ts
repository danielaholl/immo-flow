/**
 * tRPC Proxy Route for Next.js 14 App Router
 * Proxies requests to the external Express API server
 */
import { type NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://localhost:4000';

// Increase body size limit to 50MB for PDF uploads
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout

// Handle all HTTP methods (GET, POST, etc.)
const handler = async (
  req: NextRequest,
  { params }: { params: { trpc: string } }
) => {
  try {
    // Get the tRPC procedure path from the dynamic route segment
    const trpcPath = params.trpc;

    // Build the full URL with query parameters
    const url = new URL(req.url);
    const queryString = url.search;

    // Forward the request to the Express API server
    const apiUrl = `${API_URL}/trpc/${trpcPath}${queryString}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward the Authorization header if present (priority)
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    console.log('[tRPC Proxy] Auth header from request:', authHeader ? 'PRESENT' : 'MISSING');

    if (authHeader) {
      headers['Authorization'] = authHeader;
      console.log('[tRPC Proxy] Using auth header:', authHeader.substring(0, 20) + '...');
    } else {
      // Fallback to cookie if no Authorization header
      const token = req.cookies.get('auth_token')?.value;
      console.log('[tRPC Proxy] Cookie token:', token ? 'PRESENT' : 'MISSING');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('[tRPC Proxy] Using cookie token');
      }
    }

    const response = await fetch(apiUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' ? await req.text() : undefined,
    });

    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('tRPC proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to API server' },
      { status: 500 }
    );
  }
};

export { handler as GET, handler as POST };
