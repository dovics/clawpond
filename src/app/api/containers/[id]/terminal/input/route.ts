import { NextRequest, NextResponse } from 'next/server';
import Docker from 'dockerode';
import { requireAuth } from '@/lib/auth-middleware';

// Share the same global variable with terminal route
declare global {
  var activeTerminalSessions: Map<string, {
    execId: string;
    stream: NodeJS.ReadWriteStream;
    containerId: string;
  }>;
}

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

/**
 * POST /api/containers/[id]/terminal/input
 * Send input to the terminal
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const { input } = body;

    // Check if container is still running
    try {
      const container = docker.getContainer(id);
      const containerInfo = await container.inspect();
      if (containerInfo.State.Status !== 'running') {
        // Clean up session
        global.activeTerminalSessions.delete(id);
        return NextResponse.json(
          { error: 'Container is not running' },
          { status: 400 }
        );
      }
    } catch (containerError) {
      console.error(`Error checking container status for ${id}:`, containerError);
      return NextResponse.json(
        { error: 'Container not found' },
        { status: 404 }
      );
    }

    if (!input) {
      return NextResponse.json(
        { error: 'Missing input' },
        { status: 400 }
      );
    }

    // Get the active session
    const session = global.activeTerminalSessions?.get(id);

    if (!session || !session.stream) {
      console.error(`Terminal session not found for container ${id}. Session exists: ${!!session}, Stream exists: ${!!session?.stream}`);
      return NextResponse.json(
        { error: 'Terminal session not available' },
        { status: 400 }
      );
    }

    // Check if stream is still writable
    if (session.stream.destroyed || (session.stream.writable === false)) {
      console.error(`Terminal stream not writable for container ${id}. Destroyed: ${session.stream.destroyed}, Writable: ${session.stream.writable}`);
      // Clean up invalid session
      global.activeTerminalSessions.delete(id);
      return NextResponse.json(
        { error: 'Terminal session not available' },
        { status: 400 }
      );
    }

    // Write input to the terminal
    try {
      const stream = session.stream as any;
      if (!stream.write || typeof stream.write !== 'function') {
        throw new Error('Stream does not have write method');
      }
      const written = stream.write(Buffer.from(input, 'utf-8'));
      if (!written) {
        console.warn(`Stream buffer full for container ${id}, input may be delayed`);
      }
    } catch (writeError) {
      console.error(`Error writing to terminal stream for container ${id}:`, writeError);
      // Clean up broken session
      global.activeTerminalSessions.delete(id);
      return NextResponse.json(
        { error: 'Failed to write to terminal' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending terminal input:', error);
    return NextResponse.json(
      { error: 'Failed to send input' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/containers/[id]/terminal/resize
 * Resize the terminal
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const { rows, cols } = body;

    if (!rows || !cols) {
      return NextResponse.json(
        { error: 'Missing rows or cols' },
        { status: 400 }
      );
    }

    // Get the active session
    const session = global.activeTerminalSessions?.get(id);

    if (!session) {
      return NextResponse.json(
        { error: 'Terminal session not available' },
        { status: 400 }
      );
    }

    // Get the exec instance and resize
    const exec = docker.getExec(session.execId);
    await exec.resize({ h: rows, w: cols });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resizing terminal:', error);
    return NextResponse.json(
      { error: 'Failed to resize terminal' },
      { status: 500 }
    );
  }
}
