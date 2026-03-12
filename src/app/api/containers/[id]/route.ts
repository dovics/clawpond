import { NextRequest, NextResponse } from 'next/server';
import { dockerService } from '@/lib/docker.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stats = await dockerService.getContainerStats(id);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching container stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch container stats' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await dockerService.deleteContainer(id);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error deleting container:', error);
    return NextResponse.json(
      { error: 'Failed to delete container' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    let success = false;
    switch (body.action) {
      case 'start':
        success = await dockerService.startContainer(id);
        break;
      case 'stop':
        success = await dockerService.stopContainer(id);
        break;
      case 'restart':
        success = await dockerService.restartContainer(id);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error performing container action:', error);
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
