import { NextRequest, NextResponse } from 'next/server';
import { dockerService } from '@/lib/docker.service';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const config = await request.json();

    const newContainerId = await dockerService.updateConfig(id, config);
    return NextResponse.json({ success: true, containerId: newContainerId });
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json(
      { error: 'Failed to update config' },
      { status: 500 }
    );
  }
}
