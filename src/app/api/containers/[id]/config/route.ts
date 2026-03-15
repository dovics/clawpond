import { NextRequest, NextResponse } from 'next/server';
import { dockerService } from '@/lib/docker.service';
import { requireAuth } from '@/lib/auth-middleware';
import * as TOML from '@iarna/toml';

// Type for configuration object
type ConfigObject = Record<string, any>;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;

    // Get TOML config from container
    const tomlConfig = await dockerService.getConfig(id);

    // Parse TOML to JSON
    const config = TOML.parse(tomlConfig) as ConfigObject;

    return NextResponse.json({
      config,
      format: 'json'
    });
  } catch (error) {
    console.error('Error loading config:', error);
    return NextResponse.json(
      { error: 'Failed to load config' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const contentType = request.headers.get('content-type') || '';
    let tomlConfig: string;

    // Handle JSON format
    if (contentType.includes('application/json')) {
      const body = await request.json() as { config?: ConfigObject };
      const config: ConfigObject = body.config || body;

      // Convert JSON to TOML
      tomlConfig = TOML.stringify(config);
    }
    // Handle TOML format (backward compatibility)
    else if (contentType.includes('text/plain')) {
      tomlConfig = await request.text();
    }
    else {
      return NextResponse.json(
        { error: 'Unsupported content type. Use application/json or text/plain' },
        { status: 400 }
      );
    }

    const newContainerId = await dockerService.updateConfig(id, tomlConfig);
    return NextResponse.json({ success: true, containerId: newContainerId });
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json(
      { error: 'Failed to update config' },
      { status: 500 }
    );
  }
}
