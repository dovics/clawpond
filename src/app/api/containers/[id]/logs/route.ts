import { NextRequest, NextResponse } from 'next/server';
import { dockerService } from '@/lib/docker.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = await request.nextUrl.searchParams;
    const tail = parseInt(searchParams.get('tail') || '100', 10);

    const logs = await dockerService.getLogs(id, tail);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
