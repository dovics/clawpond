import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, isAuthenticated as checkCookieAuth } from './auth';

export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  // Method 1: Check if already authenticated via cookie
  const cookieAuthed = await checkCookieAuth();
  if (cookieAuthed) {
    return null; // Auth is valid, continue
  }

  // Method 2: Get token from Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization');
  let token = authHeader?.replace('Bearer ', '');

  // Method 3: Also check for token in query parameters (for SSE connections)
  if (!token) {
    const urlToken = request.nextUrl.searchParams.get('token');
    if (urlToken) {
      token = urlToken;
    }
  }

  if (!token || !verifyToken(token)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return null; // Auth is valid, continue
}

// Helper to check auth in API routes
export function getTokenFromRequest(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('authorization');
  return authHeader?.replace('Bearer ', '');
}
