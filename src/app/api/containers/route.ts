import { NextRequest, NextResponse } from 'next/server';
import { dockerService } from '@/lib/docker.service';

export async function GET(request: NextRequest) {
  try {
    const containers = await dockerService.getContainers();
    return NextResponse.json(containers);
  } catch (error) {
    console.error('Error fetching containers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch containers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const instance = await dockerService.createInstance(body);

    if (!instance) {
      return NextResponse.json(
        { error: 'Failed to create instance' },
        { status: 500 }
      );
    }

    return NextResponse.json(instance);
  } catch (error) {
    console.error('Error creating instance:', error);
    return NextResponse.json(
      { error: 'Failed to create instance' },
      { status: 500 }
    );
  }
}
