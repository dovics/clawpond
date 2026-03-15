import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { dockerContainerService, instanceStateManagerService } from '@/lib/services';
import { formatErrorResponse, logError } from '@/lib/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const stats = await instanceStateManagerService.getContainerStats(id);
    return NextResponse.json(stats);
  } catch (error) {
    logError(error, { endpoint: `/api/containers/[id]`, method: 'GET' });
    const errorResponse = formatErrorResponse(error);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { deleteWorkspace: deleteWorkspaceFlag } = body;

    // Note: Using legacy dockerService for workspace deletion
    const { dockerService } = await import('@/lib/docker.service');
    const result = await dockerService.deleteContainerAndWorkspace(id, deleteWorkspaceFlag);

    return NextResponse.json(result);
  } catch (error) {
    logError(error, { endpoint: `/api/containers/[id]`, method: 'DELETE' });
    const errorResponse = formatErrorResponse(error);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // Convert short ID to full container ID if needed
    const instances = await instanceStateManagerService.getInstances();
    const instance = instances.find(i => i.id === id);

    if (!instance) {
      return NextResponse.json(
        { error: 'Container not found' },
        { status: 404 }
      );
    }

    const containerId = instance.containerId;
    if (!containerId) {
      return NextResponse.json(
        { error: 'Invalid container ID' },
        { status: 400 }
      );
    }

    switch (body.action) {
      case 'start':
        await dockerContainerService.startContainer(containerId);
        break;
      case 'stop':
        await dockerContainerService.stopContainer(containerId);
        break;
      case 'restart':
        await dockerContainerService.restartContainer(containerId);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError(error, { endpoint: `/api/containers/[id]`, method: 'PATCH' });
    const errorResponse = formatErrorResponse(error);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
