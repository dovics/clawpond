import { NextRequest, NextResponse } from 'next/server';
import Docker from 'dockerode';
import { requireAuth } from '@/lib/auth-middleware';
import { Duplex } from 'stream';

// Store active exec instances (in production, use Redis or similar)
declare global {
  var activeTerminalSessions: Map<string, {
    execId: string;
    stream: any;
    containerId: string;
    exec: any;
  }>;
}

if (!global.activeTerminalSessions) {
  global.activeTerminalSessions = new Map();
}

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

/**
 * POST /api/containers/[id]/terminal
 * Create a new exec instance for the terminal
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;

    // Check if there's already an active session
    if (global.activeTerminalSessions.has(id)) {
      const existing = global.activeTerminalSessions.get(id);
      if (existing && existing.stream && !existing.stream.destroyed) {
        return NextResponse.json({
          execId: existing.execId,
          sessionId: id,
          reconnect: true,
        });
      } else {
        // Clean up invalid session
        global.activeTerminalSessions.delete(id);
      }
    }

    // Get the container
    const container = docker.getContainer(id);
    const containerInfo = await container.inspect();

    if (containerInfo.State.Status !== 'running') {
      return NextResponse.json(
        { error: 'Container is not running' },
        { status: 400 }
      );
    }

    // Create exec instance
    const exec = await container.exec({
      Cmd: ['/bin/bash'],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
    });

    const execInfo = await exec.inspect();

    // Start the exec and get the stream
    const rawStream = await exec.start({ Detach: false, Tty: true }) as any;

    // Debug: Log stream properties
    console.log('[Terminal Debug] Stream type:', rawStream?.constructor?.name);
    console.log('[Terminal Debug] Stream has write:', typeof rawStream?.write === 'function');
    console.log('[Terminal Debug] Stream has socket:', !!rawStream?.socket);

    // Create a duplex wrapper for the stream
    const duplexStream = new Duplex({
      write(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null) => void) {
        // Write to the underlying socket
        try {
          if (rawStream.socket && rawStream.socket.writable) {
            rawStream.socket.write(chunk, encoding, callback);
          } else {
            callback(new Error('Socket not writable'));
          }
        } catch (error) {
          callback(error as Error);
        }
      },
      read(_size: number) {
        // Reading is handled by piping the raw stream
      }
    });

    // Pipe the raw stream to our duplex stream
    rawStream.on('data', (chunk: Buffer) => {
      duplexStream.push(chunk);
    });

    rawStream.on('end', () => {
      duplexStream.push(null);
    });

    rawStream.on('error', (error: Error) => {
      duplexStream.emit('error', error);
    });

    // Store the session with both the stream and exec
    global.activeTerminalSessions.set(id, {
      execId: execInfo.ID,
      stream: duplexStream,
      containerId: id,
      exec,
    });

    // Handle stream cleanup
    duplexStream.on('end', () => {
      global.activeTerminalSessions.delete(id);
    });

    duplexStream.on('error', () => {
      global.activeTerminalSessions.delete(id);
    });

    return NextResponse.json({
      execId: execInfo.ID,
      sessionId: id,
    });
  } catch (error) {
    console.error('Error creating terminal:', error);
    return NextResponse.json(
      { error: 'Failed to create terminal' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/containers/[id]/terminal
 * Stream terminal output using Server-Sent Events
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;

    const session = global.activeTerminalSessions.get(id);
    if (!session) {
      return NextResponse.json(
        { error: 'No active terminal session' },
        { status: 404 }
      );
    }

    const encoder = new TextEncoder();
    let sendData: ((chunk: Buffer) => void) | null = null;
    let streamEnded = false;

    const stream = new ReadableStream({
      start(controller) {
        // Send data from the stream
        sendData = (chunk: Buffer) => {
          if (streamEnded) return;
          try {
            const data = chunk.toString('utf-8');
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ data })}\n\n`));
          } catch (e) {
            // Stream might be closed
            streamEnded = true;
          }
        };

        // Listen for new data
        session.stream.on('data', sendData);

        // Handle stream end
        session.stream.on('end', () => {
          streamEnded = true;
          try {
            controller.close();
          } catch (e) {
            // Stream already closed
          }
          global.activeTerminalSessions.delete(id);
        });

        // Handle stream errors
        session.stream.on('error', () => {
          streamEnded = true;
          try {
            controller.close();
          } catch (e) {
            // Stream already closed
          }
          global.activeTerminalSessions.delete(id);
        });

        // Send initial connection message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ connected: true })}\n\n`));
      },
      cancel() {
        // Don't delete session on SSE disconnect - it may still be used for input
        // Just remove our listeners
        streamEnded = true;
        if (session.stream && !session.stream.destroyed && sendData) {
          session.stream.removeListener('data', sendData);
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error streaming terminal:', error);
    return NextResponse.json(
      { error: 'Failed to stream terminal' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/containers/[id]/terminal
 * Close the terminal session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;

    const session = global.activeTerminalSessions.get(id);
    if (session) {
      // Destroy the stream
      if (session.stream && !session.stream.destroyed) {
        session.stream.destroy();
      }
      global.activeTerminalSessions.delete(id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error closing terminal:', error);
    return NextResponse.json(
      { error: 'Failed to close terminal' },
      { status: 500 }
    );
  }
}
