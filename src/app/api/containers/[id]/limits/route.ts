import { NextRequest, NextResponse } from 'next/server';
import { dockerService } from '@/lib/docker.service';
import { requireAuth } from '@/lib/auth-middleware';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const { memoryLimit, cpuLimit, port } = await request.json();

    const success = await dockerService.updateResourceLimits(id, memoryLimit, cpuLimit, port);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update resource limits' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating resource limits:', error);
    return NextResponse.json(
      { error: 'Failed to update resource limits' },
      { status: 500 }
    );
  }
}
