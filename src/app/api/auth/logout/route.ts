import { NextResponse } from 'next/server';
import { clearAuthToken } from '@/lib/auth';

export async function POST() {
  try {
    await clearAuthToken();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
