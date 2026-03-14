import { NextRequest, NextResponse } from 'next/server';
import { dockerService } from '@/lib/docker.service';
import { requireAuth } from '@/lib/auth-middleware';

// GET /api/containers/[id]/agents - Read AGENTS.md file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const content = await dockerService.getAgentsFile(id);
    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error reading AGENTS.md:', error);
    return NextResponse.json(
      { error: 'Failed to read AGENTS.md file' },
      { status: 500 }
    );
  }
}

// PUT /api/containers/[id]/agents - Write AGENTS.md file
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const { content } = await request.json();

    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content must be a string' },
        { status: 400 }
      );
    }

    await dockerService.saveAgentsFile(id, content);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error writing AGENTS.md:', error);
    return NextResponse.json(
      { error: 'Failed to write AGENTS.md file' },
      { status: 500 }
    );
  }
}
