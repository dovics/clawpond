import { NextRequest, NextResponse } from 'next/server';
import { dockerService } from '@/lib/docker.service';
import { requireAuth } from '@/lib/auth-middleware';
import fs from 'fs';
import path from 'path';

// DELETE /api/containers/[id]/skills/[skillName] - Delete a skill
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; skillName: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { id, skillName } = await params;

    if (!skillName) {
      return NextResponse.json(
        { error: 'Skill name is required' },
        { status: 400 }
      );
    }

    // Get all containers and find the one matching the id (by containerId or name)
    const containers = await dockerService.getContainers();
    const instance = containers.find(
      c => c.id === id || c.containerId === id || c.name === id
    );

    if (!instance) {
      return NextResponse.json(
        { error: 'Container not found' },
        { status: 404 }
      );
    }

    const containerName = instance.name;
    const skillPath = path.join(
      process.cwd(),
      'workspace',
      containerName,
      'workspace',
      'skills',
      skillName
    );

    if (!fs.existsSync(skillPath)) {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      );
    }

    // Delete the skill directory
    fs.rmSync(skillPath, { recursive: true, force: true });

    return NextResponse.json({
      success: true,
      message: `Skill "${skillName}" deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting skill:', error);
    return NextResponse.json(
      { error: 'Failed to delete skill' },
      { status: 500 }
    );
  }
}
