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
    const { memoryLimit, cpuLimit, port, envVars, image } = await request.json();

    // Handle image update separately (requires container recreation)
    if (image !== undefined) {
      const imageSuccess = await dockerService.updateContainerImage(id, image);
      if (!imageSuccess) {
        return NextResponse.json(
          { error: 'Failed to update container image' },
          { status: 500 }
        );
      }
      // After image update, continue with other updates if provided
      if (memoryLimit !== undefined || cpuLimit !== undefined || port !== undefined || envVars !== undefined) {
        const limitsSuccess = await dockerService.updateResourceLimits(id, memoryLimit, cpuLimit, port, envVars);
        if (!limitsSuccess) {
          return NextResponse.json(
            { error: 'Failed to update resource limits after image change' },
            { status: 500 }
          );
        }
      }
      return NextResponse.json({ success: true });
    }

    const success = await dockerService.updateResourceLimits(id, memoryLimit, cpuLimit, port, envVars);

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
