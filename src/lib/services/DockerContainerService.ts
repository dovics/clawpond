import Docker from 'dockerode';
import {
  ContainerNotFoundError,
  ContainerOperationError,
  ContainerNotRunningError,
  ContainerCreationError,
} from '@/lib/errors';

/**
 * DockerContainerService handles container lifecycle operations
 * Responsibilities:
 * - Container creation, deletion, starting, stopping, restarting
 * - Docker socket interaction
 * - Container state inspection
 */
export class DockerContainerService {
  private docker: Docker;

  constructor(socketPath: string = '/var/run/docker.sock') {
    this.docker = new Docker({ socketPath });
  }

  /**
   * Get Docker instance
   */
  getDocker(): Docker {
    return this.docker;
  }

  /**
   * Get container by ID
   */
  getContainer(containerId: string) {
    return this.docker.getContainer(containerId);
  }

  /**
   * List all containers
   */
  async listContainers(all: boolean = false): Promise<Docker.ContainerInfo[]> {
    try {
      return await this.docker.listContainers({ all });
    } catch (error) {
      throw new ContainerOperationError('', 'list', String(error));
    }
  }

  /**
   * Filter ZeroClaw/OpenClaw containers
   */
  async getZeroClawContainers(): Promise<Docker.ContainerInfo[]> {
    const containers = await this.listContainers(true);
    return containers.filter(c =>
      c.Names.some(name => name.includes('zeroclaw') || name.includes('openclaw'))
    );
  }

  /**
   * Get container info
   */
  async inspectContainer(containerId: string): Promise<Docker.ContainerInspectInfo> {
    try {
      const container = this.getContainer(containerId);
      return await container.inspect();
    } catch (error) {
      throw new ContainerNotFoundError(containerId);
    }
  }

  /**
   * Create a new container
   */
  async createContainer(config: Docker.ContainerCreateOptions): Promise<Docker.Container> {
    try {
      return await this.docker.createContainer(config);
    } catch (error) {
      throw new ContainerCreationError(
        error instanceof Error ? error.message : String(error),
        { config }
      );
    }
  }

  /**
   * Start a container
   */
  async startContainer(containerId: string): Promise<void> {
    try {
      const container = this.getContainer(containerId);
      await container.start();
    } catch (error) {
      throw new ContainerOperationError(containerId, 'start', String(error));
    }
  }

  /**
   * Stop a container
   */
  async stopContainer(containerId: string): Promise<void> {
    try {
      const container = this.getContainer(containerId);
      await container.stop();
    } catch (error) {
      throw new ContainerOperationError(containerId, 'stop', String(error));
    }
  }

  /**
   * Restart a container
   */
  async restartContainer(containerId: string): Promise<void> {
    try {
      const container = this.getContainer(containerId);
      await container.restart();
    } catch (error) {
      throw new ContainerOperationError(containerId, 'restart', String(error));
    }
  }

  /**
   * Delete a container
   */
  async deleteContainer(containerId: string, force: boolean = true): Promise<void> {
    try {
      const container = this.getContainer(containerId);
      await container.remove({ force, v: true });
    } catch (error) {
      throw new ContainerOperationError(containerId, 'delete', String(error));
    }
  }

  /**
   * Check if container is running
   */
  async isContainerRunning(containerId: string): Promise<boolean> {
    try {
      const info = await this.inspectContainer(containerId);
      return info.State.Status === 'running';
    } catch (error) {
      return false;
    }
  }

  /**
   * Ensure container is running, throw error if not
   */
  async ensureContainerRunning(containerId: string): Promise<void> {
    if (!await this.isContainerRunning(containerId)) {
      throw new ContainerNotRunningError(containerId);
    }
  }

  /**
   * Pull Docker image
   */
  async pullImage(imageName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.docker.pull(imageName, (err: Error, stream: NodeJS.ReadableStream) => {
        if (err) {
          reject(new ContainerCreationError(`Failed to pull image ${imageName}: ${err.message}`));
          return;
        }

        this.docker.modem.followProgress(stream, (err) => {
          if (err) {
            reject(new ContainerCreationError(`Failed to pull image ${imageName}: ${err.message}`));
          } else {
            resolve();
          }
        });
      });
    });
  }

  /**
   * Get container logs
   */
  async getContainerLogs(
    containerId: string,
    options: { tail?: number; stdout?: boolean; stderr?: boolean } = {}
  ): Promise<string> {
    try {
      const container = this.getContainer(containerId);
      const logs = await container.logs({
        stdout: options.stdout !== false,
        stderr: options.stderr !== false,
        tail: options.tail || 100,
        timestamps: false,
      });
      return logs.toString('utf-8');
    } catch (error) {
      throw new ContainerOperationError(containerId, 'get logs', String(error));
    }
  }

  /**
   * Execute command in container
   */
  async execInContainer(
    containerId: string,
    command: string[],
    options: { AttachStdout?: boolean; AttachStderr?: boolean } = {}
  ): Promise<NodeJS.ReadableStream> {
    try {
      const container = this.getContainer(containerId);
      const exec = await container.exec({
        Cmd: command,
        AttachStdout: options.AttachStdout !== false,
        AttachStderr: options.AttachStderr !== false,
      });
      return await exec.start({ Detach: false });
    } catch (error) {
      throw new ContainerOperationError(containerId, 'exec', String(error));
    }
  }

  /**
   * Get container stats
   */
  async getContainerStats(containerId: string): Promise<Docker.ContainerStats> {
    try {
      const container = this.getContainer(containerId);
      return await container.stats({ stream: false });
    } catch (error) {
      throw new ContainerOperationError(containerId, 'get stats', String(error));
    }
  }
}

// Export singleton instance
export const dockerContainerService = new DockerContainerService();
