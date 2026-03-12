import { NextRequest, NextResponse } from 'next/server';
import { dockerService } from '@/lib/docker.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
