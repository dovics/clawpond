import { NextResponse } from 'next/server';
import Docker from 'dockerode';

/**
 * Health check endpoint
 * This endpoint does not require authentication and checks:
 * 1. Application status
 * 2. Docker daemon connection
 */
export async function GET() {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      app: 'ok',
      docker: 'unknown',
    },
  };

  // Check Docker daemon connection
  try {
    const docker = new Docker({ socketPath: '/var/run/docker.sock' });

    // Try to ping Docker daemon
    await docker.ping();

    healthStatus.checks.docker = 'ok';
  } catch (error) {
    console.error('Docker health check failed:', error);
    healthStatus.checks.docker = 'error';
    healthStatus.status = 'unhealthy';

    // Return 503 service unavailable when Docker is not accessible
    return NextResponse.json(healthStatus, { status: 503 });
  }

  // Return 200 OK when all checks pass
  return NextResponse.json(healthStatus, { status: 200 });
}
