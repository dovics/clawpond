import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';

export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  // Get token from cookie
  const token = request.cookies.get('auth_token')?.value;

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
  return request.cookies.get('auth_token')?.value;
}
