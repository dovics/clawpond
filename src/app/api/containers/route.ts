import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { instanceStateManagerService } from '@/lib/services';
import { formatErrorResponse, logError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const instances = await instanceStateManagerService.getInstances();
    return NextResponse.json(instances);
  } catch (error) {
    logError(error, { endpoint: '/api/containers', method: 'GET' });
    const errorResponse = formatErrorResponse(error);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    // Validate required fields
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Note: Using legacy dockerService for now
    // This will be updated once we complete the service migration
    const { dockerService } = await import('@/lib/docker.service');
    const instance = await dockerService.createInstance(body);

    if (!instance) {
      throw new Error('Failed to create instance');
    }

    return NextResponse.json(instance);
  } catch (error) {
    logError(error, { endpoint: '/api/containers', method: 'POST' });
    const errorResponse = formatErrorResponse(error);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
