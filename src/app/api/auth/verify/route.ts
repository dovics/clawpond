import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, setAuthToken, isAuthenticated } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    let token: string | undefined;

    // Method 1: Check if already authenticated via cookie
    const alreadyAuthed = await isAuthenticated();
    if (alreadyAuthed) {
      return NextResponse.json({ success: true });
    }

    // Method 2: Check Authorization header (Bearer token)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
    }

    // Method 3: Check JSON body (for login form)
    if (!token) {
      try {
        const body = await request.json();
        token = body.token;
      } catch {
        // No body or invalid JSON, continue
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 401 }
      );
    }

    if (verifyToken(token)) {
      await setAuthToken(token);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
