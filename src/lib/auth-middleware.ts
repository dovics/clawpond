import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';

export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  // Get token from Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization');
  let token = authHeader?.replace('Bearer ', '');

  // Also check for token in query parameters (for SSE connections)
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
