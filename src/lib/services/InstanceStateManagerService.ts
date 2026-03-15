import Docker from 'dockerode';
import { ZeroClawInstance, ContainerStats, ZeroClawConfig } from '@/types';
import { DockerContainerService } from './DockerContainerService';
import { ConfigManagerService } from './ConfigManagerService';
import { ContainerNotFoundError, ContainerOperationError } from '@/lib/errors';

/**
 * InstanceStateManagerService manages instance state and statistics
 * Responsibilities:
 * - Instance state tracking
 * - Resource statistics (CPU, memory)
 * - Health checks
 * - Instance data aggregation
 */
export class InstanceStateManagerService {
  constructor(
    private containerService: DockerContainerService,
    private configService: ConfigManagerService
  ) {}

  /**
   * Extract port from container port bindings
   */
  private extractPort(ports: Docker.Port[] | undefined): number | undefined {
    if (!ports || ports.length === 0) return undefined;
    const publicPort = ports.find(p => p.PublicPort !== undefined && p.PublicPort !== 0);
    return publicPort?.PublicPort;
  }

  /**
   * Extract all ports from container info
   */
  private extractPorts(ports: Record<string, Array<{HostPort: string}>> | undefined): string[] {
    if (!ports) return [];
    const result: string[] = [];
    for (const portKey in ports) {
      if (ports[portKey] && ports[portKey]![0]) {
        result.push(ports[portKey]![0].HostPort);
      }
    }
    return result;
  }

  /**
   * Map Docker container state to application status
   */
  private mapContainerStatus(state: string): 'running' | 'stopped' | 'paused' | 'unknown' {
    switch (state) {
      case 'running':
        return 'running';
      case 'paused':
        return 'paused';
      case 'exited':
        return 'stopped';
      case 'dead':
        return 'unknown';
      default:
        return 'unknown';
    }
  }

  /**
   * Calculate CPU usage percentage from stats
   */
  private calculateCpuUsage(stats: Docker.ContainerStats): number {
    if (!stats.cpu_stats || !stats.cpu_stats.cpu_usage) {
      return 0;
    }

    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage -
      (stats.precpu_stats?.cpu_usage?.total_usage || 0);
    const systemDelta = stats.cpu_stats.system_cpu_usage -
      (stats.precpu_stats?.system_cpu_usage || 0);
    const onlineCpus = stats.cpu_stats.online_cpus || 1;

    return cpuDelta > 0 && systemDelta > 0
      ? (cpuDelta / systemDelta) * onlineCpus * 100
      : 0;
  }

  /**
   * Get memory usage from stats
   */
  private getMemoryUsage(stats: Docker.ContainerStats): {
    usage: number;
    limit: number;
  } {
    if (!stats.memory_stats) {
      return { usage: 0, limit: 0 };
    }

    return {
      usage: stats.memory_stats.usage || 0,
      limit: stats.memory_stats.limit || 0,
    };
  }

  /**
   * Get config from container labels or file
   */
  private async getConfigFromContainer(
    containerInfo: Docker.ContainerInspectInfo
  ): Promise<ZeroClawConfig> {
    const name = containerInfo.Name.replace(/^\//, '');

    // Try to read from config file first
    if (this.configService.configExists(name)) {
      try {
        return this.configService.readConfig(name);
      } catch (error) {
        console.warn(`Failed to read config for ${name}:`, error);
      }
    }

    // Fall back to labels (basic info)
    const labels = containerInfo.Config.Labels || {};
    return {
      gateway: {
        port: labels['openclaw.port']
          ? parseInt(labels['openclaw.port'])
          : undefined,
      },
    };
  }

  /**
   * Convert Docker container to ZeroClawInstance
   */
  async containerToInstance(
    container: Docker.ContainerInfo
  ): Promise<ZeroClawInstance> {
    const containerObj = this.containerService.getContainer(container.Id);
    const containerInfo = await containerObj.inspect();

    const name = container.Names[0].replace(/^\//, '');
    const labels = containerInfo.Config.Labels || {};
    const port = this.extractPort(container.Ports);
    const isRunning = container.State === 'running';

    // Get stats for running containers
    let cpuUsage: number | undefined;
    let memoryUsage: { usage: number; limit: number } | undefined;

    if (isRunning) {
      try {
        const stats = await this.containerService.getContainerStats(container.Id);
        cpuUsage = this.calculateCpuUsage(stats);
        memoryUsage = this.getMemoryUsage(stats);
      } catch (statsError) {
        console.warn(`Failed to get stats for ${container.Id.substring(0, 12)}:`, statsError);
      }
    }

    return {
      id: container.Id.substring(0, 12),
      name: labels['openclaw.name'] || name,
      containerId: container.Id,
      status: this.mapContainerStatus(container.State),
      port: port,
      config: await this.getConfigFromContainer(containerInfo),
      createdAt: containerInfo.Created,
      lastActive: containerInfo.State.StartedAt,
      memoryLimit: labels['openclaw.memoryLimit']
        ? parseInt(labels['openclaw.memoryLimit'])
        : undefined,
      cpuLimit: labels['openclaw.cpuLimit']
        ? parseFloat(labels['openclaw.cpuLimit'])
        : undefined,
      cpu: cpuUsage !== undefined ? { usage: cpuUsage } : undefined,
      memory: memoryUsage,
    };
  }

  /**
   * Get all ZeroClaw instances
   */
  async getInstances(): Promise<ZeroClawInstance[]> {
    try {
      const containers = await this.containerService.getZeroClawContainers();
      const instances: ZeroClawInstance[] = [];

      for (const container of containers) {
        try {
          const instance = await this.containerToInstance(container);
          instances.push(instance);
        } catch (error) {
          console.warn(`Failed to process container ${container.Id}:`, error);
        }
      }

      return instances;
    } catch (error) {
      console.error('Error fetching instances:', error);
      return [];
    }
  }

  /**
   * Get detailed container stats
   */
  async getContainerStats(containerId: string): Promise<ContainerStats | null> {
    try {
      const stats = await this.containerService.getContainerStats(containerId);
      const info = await this.containerService.inspectContainer(containerId);

      const memoryUsage = this.getMemoryUsage(stats);

      return {
        id: containerId.substring(0, 12),
        name: info.Name.replace(/^\//, ''),
        state: info.State.Status,
        status: info.State.Status,
        created: new Date(info.Created).toISOString(),
        ports: this.extractPorts(info.NetworkSettings.Ports),
        memory: {
          usage: memoryUsage.usage,
          limit: memoryUsage.limit,
          percentage: memoryUsage.limit > 0
            ? (memoryUsage.usage / memoryUsage.limit) * 100
            : 0,
        },
        cpu: this.calculateCpuUsage(stats),
      };
    } catch (error) {
      console.error('Error getting container stats:', error);
      return null;
    }
  }

  /**
   * Get instance by ID
   */
  async getInstanceById(instanceId: string): Promise<ZeroClawInstance | null> {
    try {
      const instances = await this.getInstances();
      return instances.find(i => i.id === instanceId) || null;
    } catch (error) {
      console.error(`Error getting instance ${instanceId}:`, error);
      return null;
    }
  }

  /**
   * Health check for an instance
   */
  async healthCheck(instanceId: string): Promise<boolean> {
    try {
      const instance = await this.getInstanceById(instanceId);
      if (!instance || !instance.containerId) {
        return false;
      }

      // Check if container is running
      const isRunning = await this.containerService.isContainerRunning(
        instance.containerId
      );

      return isRunning;
    } catch (error) {
      console.error(`Health check failed for ${instanceId}:`, error);
      return false;
    }
  }

  /**
   * Get instance health status with details
   */
  async getHealthStatus(instanceId: string): Promise<{
    healthy: boolean;
    status: string;
    message?: string;
  }> {
    try {
      const instance = await this.getInstanceById(instanceId);
      if (!instance) {
        return {
          healthy: false,
          status: 'not_found',
          message: 'Instance not found',
        };
      }

      if (!instance.containerId) {
        return {
          healthy: false,
          status: 'error',
          message: 'Invalid container ID',
        };
      }

      const isRunning = await this.containerService.isContainerRunning(
        instance.containerId
      );

      if (!isRunning) {
        return {
          healthy: false,
          status: instance.status,
          message: 'Container is not running',
        };
      }

      return {
        healthy: true,
        status: instance.status,
        message: 'Instance is healthy',
      };
    } catch (error) {
      return {
        healthy: false,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
import { dockerContainerService } from './DockerContainerService';
import { configManagerService } from './ConfigManagerService';

export const instanceStateManagerService = new InstanceStateManagerService(
  dockerContainerService,
  configManagerService
);
