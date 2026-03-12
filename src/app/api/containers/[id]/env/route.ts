import { NextRequest, NextResponse } from 'next/server';
import { dockerService } from '@/lib/docker.service';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const env = await dockerService.getContainerEnv(id);
    return NextResponse.json({ env });
  } catch (error) {
    console.error('Error getting container env:', error);
    return NextResponse.json(
      { error: 'Failed to get container env' },
      { status: 500 }
    );
  }
}
