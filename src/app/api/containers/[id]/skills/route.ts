import { NextRequest, NextResponse } from 'next/server';
import { dockerService } from '@/lib/docker.service';
import { requireAuth } from '@/lib/auth-middleware';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

// GET /api/containers/[id]/skills - Get skills list
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;

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
    const containerPath = `openclaw-${containerName}`;
    const skillsPath = path.join(
      process.cwd(),
      'workspace',
      containerPath,
      'workspace',
      'skills'
    );

    // Ensure skills directory exists
    if (!fs.existsSync(skillsPath)) {
      fs.mkdirSync(skillsPath, { recursive: true });
    }

    // Read skills directories
    const entries = fs.readdirSync(skillsPath, { withFileTypes: true });
    const skills = entries
      .filter(entry => entry.isDirectory())
      .map(dir => {
        const skillPath = path.join(skillsPath, dir.name);
        const files = fs.readdirSync(skillPath);
        return {
          name: dir.name,
          path: path.join('workspace', containerPath, 'workspace', 'skills', dir.name),
          files,
        };
      });

    return NextResponse.json({ skills });
  } catch (error) {
    console.error('Error fetching skills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skills' },
      { status: 500 }
    );
  }
}

// POST /api/containers/[id]/skills - Install skill from ZIP
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const { skillName, zipBase64 } = await request.json();

    if (!skillName || !zipBase64) {
      return NextResponse.json(
        { error: 'skillName and zipBase64 are required' },
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
    const containerPath = `openclaw-${containerName}`;
    const skillsPath = path.join(
      process.cwd(),
      'workspace',
      containerPath,
      'workspace',
      'skills',
      skillName
    );

    // Ensure parent skills directory exists
    const parentSkillsPath = path.dirname(skillsPath);
    if (!fs.existsSync(parentSkillsPath)) {
      fs.mkdirSync(parentSkillsPath, { recursive: true });
    }

    // Remove existing skill if it exists
    if (fs.existsSync(skillsPath)) {
      fs.rmSync(skillsPath, { recursive: true, force: true });
    }

    // Create skill directory
    fs.mkdirSync(skillsPath, { recursive: true });

    // Decode base64 and extract ZIP
    const zipBuffer = Buffer.from(zipBase64, 'base64');
    const zip = await JSZip.loadAsync(zipBuffer);

    // Extract all files
    // Strip the top-level folder from the path if it matches skillName to avoid double nesting
    const extractPromises: Promise<void>[] = [];
    zip.forEach((relativePath, file) => {
      if (!file.dir) {
        // Remove the top-level folder from the path if it exists
        // e.g., "xiaohongshu-mcp-skills/config.json" -> "config.json"
        let extractedPath = relativePath;
        const pathParts = relativePath.split('/');
        if (pathParts[0] === skillName && pathParts.length > 1) {
          extractedPath = pathParts.slice(1).join('/');
        }

        const filePath = path.join(skillsPath, extractedPath);
        const fileDir = path.dirname(filePath);

        // Ensure file directory exists
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }

        const extractPromise = file.async('nodebuffer').then(content => {
          fs.writeFileSync(filePath, content);
        });
        extractPromises.push(extractPromise);
      }
    });

    await Promise.all(extractPromises);

    return NextResponse.json({
      success: true,
      message: `Skill "${skillName}" installed successfully`,
    });
  } catch (error) {
    console.error('Error installing skill:', error);
    return NextResponse.json(
      { error: 'Failed to install skill' },
      { status: 500 }
    );
  }
}
