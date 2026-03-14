import Docker from 'dockerode';
import { ContainerStats, ZeroClawInstance, CreateInstanceOptions } from '@/types';
import { getZeroClawImage } from '@/lib/config';
import * as TOML from '@iarna/toml';
import path from 'path';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// 宿主机上的工作目录固定为当前目录下的 workspace 文件夹
const WORKSPACE_ROOT = path.join(process.cwd(), 'workspace');

// Docker 容器内的挂载点路径（用于 bind mount），从环境变量读取
const MOUNT_WORKSPACE_ROOT = process.env.MOUNT_WORKSPACE_ROOT || WORKSPACE_ROOT;

/**
 * 获取当前进程的 UID 和 GID
 * 直接获取当前运行进程的用户和组 ID
 */
function getUidGid(): { uid: number; gid: number } {
  try {
    // 使用 Node.js 内置方法获取当前进程的用户和组 ID
    return {
      uid: typeof process.getuid === 'function' ? process.getuid() : 1000,
      gid: typeof process.getgid === 'function' ? process.getgid() : 1000,
    };
  } catch (error) {
    console.warn('Failed to get UID/GID, using defaults (1000:1000)', error);
    return { uid: 1000, gid: 1000 };
  }
}

const DEFAULT_CONFIG = `default_provider = "openrouter"
default_model = "anthropic/claude-sonnet-4.6"
default_temperature = 0.7

[observability]
backend = "none"
runtime_trace_mode = "none"

[autonomy]
level = "supervised"
workspace_only = true

[gateway]
port = 42617
host = "0.0.0.0"
require_pairing = false
allow_public_bind = true

[memory]
backend = "sqlite"
auto_save = true

[reliability]
provider_retries = 2
provider_backoff_ms = 500
`;

export class DockerService {
  /**
   * Get all ZeroClaw containers
   */
  async getContainers(): Promise<ZeroClawInstance[]> {
    try {
      const containers = await docker.listContainers({ all: true });
      const zeroclawContainers = containers.filter(c =>
        c.Names.some(name => name.includes('zeroclaw') || name.includes('openclaw'))
      );

      const instances: ZeroClawInstance[] = [];
      for (const container of zeroclawContainers) {
        const containerObj = docker.getContainer(container.Id);
        const containerInfo = await containerObj.inspect();

        const name = container.Names[0].replace(/^\//, '');
        const labels = containerInfo.Config.Labels || {};
        const port = this.extractPort(container.Ports);
        const isRunning = container.State === 'running';

        // Get stats for running containers
        let cpuUsage: number | undefined;
        let memoryUsage: number | undefined;
        let memoryLimit: number | undefined;

        if (isRunning) {
          try {
            const stats = await containerObj.stats({ stream: false });

            // Safely access memory stats
            if (stats.memory_stats) {
              memoryUsage = stats.memory_stats.usage || 0;
              memoryLimit = stats.memory_stats.limit || 0;
            }

            // Safely access CPU stats
            if (stats.cpu_stats && stats.cpu_stats.cpu_usage) {
              const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - (stats.precpu_stats?.cpu_usage?.total_usage || 0);
              const systemDelta = stats.cpu_stats.system_cpu_usage - (stats.precpu_stats?.system_cpu_usage || 0);
              const onlineCpus = stats.cpu_stats.online_cpus || 1;

              cpuUsage = cpuDelta > 0 && systemDelta > 0 ? (cpuDelta / systemDelta) * onlineCpus * 100 : 0;
            }
          } catch (statsError) {
            console.warn(`Failed to get stats for container ${container.Id.substring(0, 12)}:`, statsError);
          }
        }

        instances.push({
          id: container.Id.substring(0, 12),
          name: labels['openclaw.name'] || name,
          containerId: container.Id,
          status: this.mapContainerStatus(container.State),
          port: port,
          config: await this.getConfigFromContainer(containerInfo),
          createdAt: containerInfo.Created,
          lastActive: containerInfo.State.StartedAt,
          memoryLimit: labels['openclaw.memoryLimit'] ? parseInt(labels['openclaw.memoryLimit']) : undefined,
          cpuLimit: labels['openclaw.cpuLimit'] ? parseFloat(labels['openclaw.cpuLimit']) : undefined,
          cpu: cpuUsage !== undefined ? { usage: cpuUsage } : undefined,
          memory: memoryUsage !== undefined && memoryLimit !== undefined ? {
            usage: memoryUsage,
            limit: memoryLimit,
          } : undefined,
        });
      }

      return instances;
    } catch (error) {
      console.error('Error fetching containers:', error);
      return [];
    }
  }

  /**
   * Get container stats
   */
  async getContainerStats(containerId: string): Promise<ContainerStats | null> {
    try {
      const container = docker.getContainer(containerId);
      const stats = await container.stats({ stream: false });
      const info = await container.inspect();

      // Safely access memory stats
      let memoryUsage = 0;
      let memoryLimit = 0;
      if (stats.memory_stats) {
        memoryUsage = stats.memory_stats.usage || 0;
        memoryLimit = stats.memory_stats.limit || 0;
      }

      // Safely access CPU stats
      let cpuPercent = 0;
      if (stats.cpu_stats && stats.cpu_stats.cpu_usage) {
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - (stats.precpu_stats?.cpu_usage?.total_usage || 0);
        const systemDelta = stats.cpu_stats.system_cpu_usage - (stats.precpu_stats?.system_cpu_usage || 0);
        cpuPercent = cpuDelta > 0 && systemDelta > 0 ? (cpuDelta / systemDelta) * 100 : 0;
      }

      return {
        id: containerId.substring(0, 12),
        name: info.Name.replace(/^\//, ''),
        state: info.State.Status,
        status: info.State.Status,
        created: new Date(info.Created).toISOString(),
        ports: this.extractPorts(info.NetworkSettings.Ports),
        memory: {
          usage: memoryUsage,
          limit: memoryLimit,
          percentage: memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0,
        },
        cpu: cpuPercent,
      };
    } catch (error) {
      console.error('Error getting container stats:', error);
      return null;
    }
  }

  /**
   * Get container environment variables
   */
  async getContainerEnv(containerId: string): Promise<string[]> {
    try {
      const container = docker.getContainer(containerId);
      const info = await container.inspect();
      return info.Config.Env || [];
    } catch (error) {
      console.error('Error getting container env:', error);
      return [];
    }
  }

  /**
   * Create a new ZeroClaw instance
   */
  async createInstance(options: CreateInstanceOptions): Promise<ZeroClawInstance | null> {
    try {
      // 如果用户没有填写 Port，则不暴露端口
      const shouldExposePort = options.port !== undefined && options.port !== null;
      const port = shouldExposePort ? options.port : 42617;

      // 获取当前用户 UID/GID
      const { uid, gid } = getUidGid();

      // Build config with model and temperature settings
      const configOverride: any = {
        ...options.config,
      };

      if (options.provider) {
        configOverride.default_provider = options.provider;
      }

      if (options.model) {
        configOverride.default_model = options.model;
      }

      if (options.temperature !== undefined) {
        configOverride.default_temperature = options.temperature;
      }

      // Handle custom OpenAI-compatible provider
      if (options.baseUrl) {
        configOverride.api_base = options.baseUrl;
      }

      // Create config directory on host using workspace root from environment variable
      // System will automatically create config file, we just need to provide the directory
      const fs = require('fs');
      const path = require('path');

      // 使用环境变量指定的工作目录，为每个实例创建子目录
      // Sanitize the name to only use valid Docker volume name characters [a-zA-Z0-9_.-]
      const instanceDirName = `openclaw-${options.name.toLowerCase().replace(/[^a-z0-9_.-]/g, '-')}`;

      // 宿主机上的实际路径（用于文件操作）
      const hostConfigDir = path.join(WORKSPACE_ROOT, instanceDirName);
      const zeroclawDir = path.join(hostConfigDir, '.zeroclaw');

      // Docker 容器内的挂载路径（用于 bind mount）
      const mountConfigDir = path.join(MOUNT_WORKSPACE_ROOT, instanceDirName);

      // Create directory structure (system will create config file automatically)
      fs.mkdirSync(zeroclawDir, { recursive: true });

      // Check if we have template config that should be applied asynchronously
      const hasTemplateConfig = options.config && Object.keys(options.config).length > 0;

      // Don't write config file immediately - let the system create default config first
      // We'll apply template config asynchronously after container is ready

      const env = [
        `ZEROCLAW_GATEWAY_PORT=${port}`,
        `ZEROCLAW_GATEWAY_HOST=0.0.0.0`,
        `ZEROCLAW_ALLOW_PUBLIC_BIND=true`,
      ];

      if (options.apiKey) {
        env.push(`API_KEY=${options.apiKey}`);
      }

      if (options.provider) {
        env.push(`ZEROCLAW_PROVIDER=${options.provider}`);
      }

      // 从配置中读取Docker环境变量
      if (configOverride.runtime?.docker?.env && Array.isArray(configOverride.runtime.docker.env)) {
        env.push(...configOverride.runtime.docker.env);
      }

      // Use configured limits or defaults
      const memoryLimitBytes = (options.memoryLimit || 500) * 1024 * 1024;
      const cpuLimitNanos = (options.cpuLimit || 0.5) * 1000000000;

      // Build container config
      const containerConfig: any = {
        name: `openclaw-${options.name.toLowerCase().replace(/[^a-z0-9_.-]/g, '-')}`,
        Image: getZeroClawImage(),
        Cmd: ['daemon'],
        User: `${uid}:${gid}`,
        Env: env,
        HostConfig: {
          Binds: [`${mountConfigDir}:/zeroclaw-data`],
          RestartPolicy: {
            Name: 'unless-stopped'
          },
          Memory: memoryLimitBytes,
          NanoCpus: cpuLimitNanos,
        },
        Labels: {
          'openclaw.managed': 'true',
          'openclaw.name': options.name,
          'openclaw.memoryLimit': (options.memoryLimit || 500).toString(),
          'openclaw.cpuLimit': (options.cpuLimit || 0.5).toString(),
        },
      };

      // 只有当用户明确提供 port 时才暴露端口
      if (shouldExposePort && options.port) {
        containerConfig.ExposedPorts = {
          [`${options.port}/tcp`]: {}
        };
        containerConfig.HostConfig.PortBindings = {
          [`${options.port}/tcp`]: [{ HostPort: options.port.toString() }]
        };
        containerConfig.Labels['openclaw.port'] = options.port.toString();
      }

      // Pull image if not exists
      await this.pullImage(getZeroClawImage());

      const container = await docker.createContainer(containerConfig);
      await container.start();

      // Execute zeroclaw onboard command to configure the instance
      if (options.apiKey && (options.provider || options.model)) {
        try {
          // Wait a moment for the container to be ready
          await new Promise(resolve => setTimeout(resolve, 2000));

          const onboardCmd = ['zeroclaw', 'onboard'];
          if (options.apiKey) {
            onboardCmd.push('--api-key', options.apiKey);
          }
          if (options.provider) {
            onboardCmd.push('--provider', options.provider);
          }
          if (options.model) {
            onboardCmd.push('--model', options.model);
          }

          const exec = await container.exec({
            Cmd: onboardCmd,
            AttachStdout: true,
            AttachStderr: true,
          });

          // Start the exec and wait for completion
          const stream = await exec.start({ Detach: false });
          await new Promise((resolve, reject) => {
            stream.on('end', resolve);
            stream.on('error', reject);
          });
        } catch (onboardError) {
          console.warn('Onboard command failed (this may be expected):', onboardError);
        }
      }

      // Apply template config asynchronously if provided
      if (hasTemplateConfig) {
        // Don't wait for this to complete - return immediately to user
        this.applyConfigAsync(container.id, configOverride, instanceDirName).catch(error => {
          console.error('Failed to apply template config asynchronously:', error);
        });
      }

      return {
        id: container.id.substring(0, 12),
        name: options.name,
        containerId: container.id,
        status: 'running',
        port: shouldExposePort ? port : undefined,
        config: configOverride,
        createdAt: new Date().toISOString(),
        // Add flag to indicate config is being applied
        configApplying: hasTemplateConfig,
      };
    } catch (error) {
      console.error('Error creating instance:', error);
      return null;
    }
  }

  /**
   * Start a container
   */
  async startContainer(containerId: string): Promise<boolean> {
    try {
      const container = docker.getContainer(containerId);
      await container.start();
      return true;
    } catch (error) {
      console.error('Error starting container:', error);
      return false;
    }
  }

  /**
   * Stop a container
   */
  async stopContainer(containerId: string): Promise<boolean> {
    try {
      const container = docker.getContainer(containerId);
      await container.stop();
      return true;
    } catch (error) {
      console.error('Error stopping container:', error);
      return false;
    }
  }

  /**
   * Restart a container
   */
  async restartContainer(containerId: string): Promise<boolean> {
    try {
      const container = docker.getContainer(containerId);
      await container.restart();
      return true;
    } catch (error) {
      console.error('Error restarting container:', error);
      return false;
    }
  }

  /**
   * Delete a container
   */
  async deleteContainer(containerId: string): Promise<boolean> {
    try {
      const container = docker.getContainer(containerId);
      await container.remove({ force: true, v: true });
      return true;
    } catch (error) {
      console.error('Error deleting container:', error);
      return false;
    }
  }

  /**
   * Delete workspace directory for a container by container name
   * This method should be called with the container name, not ID
   */
  async deleteWorkspace(containerName: string): Promise<boolean> {
    try {
      const fs = require('fs');
      const path = require('path');

      // Remove leading slash if present
      const cleanContainerName = containerName.replace(/^\//, '');
      const workspaceDir = path.join(WORKSPACE_ROOT, cleanContainerName);

      if (fs.existsSync(workspaceDir)) {
        fs.rmSync(workspaceDir, { recursive: true, force: true });
        console.log(`Deleted workspace directory: ${workspaceDir}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error deleting workspace:', error);
      return false;
    }
  }

  /**
   * Delete container and optionally its workspace
   * This method gets container info before deleting, so workspace can be deleted after
   */
  async deleteContainerAndWorkspace(containerId: string, deleteWorkspaceFlag: boolean): Promise<{ success: boolean; workspaceDeleted: boolean }> {
    try {
      let containerName: string | undefined;

      // Get container info BEFORE deleting
      if (deleteWorkspaceFlag) {
        try {
          const container = docker.getContainer(containerId);
          const containerInfo = await container.inspect();
          containerName = containerInfo.Name;
        } catch (error) {
          console.warn('Could not get container info for workspace deletion:', error);
        }
      }

      // Delete the container
      const success = await this.deleteContainer(containerId);

      // Delete workspace if requested and we got the container name
      let workspaceDeleted = false;
      if (deleteWorkspaceFlag && containerName && success) {
        workspaceDeleted = await this.deleteWorkspace(containerName);
      }

      return { success, workspaceDeleted };
    } catch (error) {
      console.error('Error deleting container and workspace:', error);
      return { success: false, workspaceDeleted: false };
    }
  }

  /**
   * Update container configuration
   * @returns The container ID to use for subsequent operations (may be new if container was recreated)
   */
  async updateConfig(containerId: string, config: any): Promise<string> {
    const container = docker.getContainer(containerId);
    const containerInfo = await container.inspect();
    const fs = require('fs');
    const path = require('path');

    // Get the config file path on the host
    // Container name is the same as directory name (e.g., "openclaw-zeroagent")
    const containerName = containerInfo.Name.replace(/^\//, '');
    const configPath = path.join(WORKSPACE_ROOT, containerName, '.zeroclaw', 'config.toml');

    // Write config to file on host (which is mounted into container)
    const configContent = TOML.stringify(config);
    fs.writeFileSync(configPath, configContent, 'utf-8');

    // Check if runtime.docker.env has changed
    const currentEnv = containerInfo.Config.Env || [];
    const newEnvVars = config.runtime?.docker?.env || [];
    const envChanged = this.hasEnvChanged(currentEnv, newEnvVars);

    if (envChanged) {
      // Environment variables changed, need to recreate container
      console.log('Environment variables changed, recreating container...');
      return await this.recreateContainer(containerInfo, config);
    } else {
      console.log('Environment variables unchanged, only restarting container');
      // Only restart container to apply config changes
      await this.restartContainer(containerId);
      return containerId;
    }
  }

  /**
   * Check if environment variables have changed
   */
  private hasEnvChanged(currentEnv: string[], newEnvVars: string[]): boolean {
    const currentEnvMap = new Map<string, string>();
    currentEnv.forEach(env => {
      const eqIndex = env.indexOf('=');
      if (eqIndex > 0) {
        currentEnvMap.set(env.substring(0, eqIndex), env.substring(eqIndex + 1));
      }
    });

    const newEnvMap = new Map<string, string>();
    newEnvVars.forEach(env => {
      const eqIndex = env.indexOf('=');
      if (eqIndex > 0) {
        newEnvMap.set(env.substring(0, eqIndex), env.substring(eqIndex + 1));
      }
    });

    // Only compare custom env vars (exclude system defaults)
    const systemKeys = new Set(['ZEROCLAW_GATEWAY_PORT', 'ZEROCLAW_GATEWAY_HOST', 'ZEROCLAW_ALLOW_PUBLIC_BIND', 'PATH', 'HOSTNAME', 'HOME', 'TERM', 'SSL_CERT_FILE']);

    // Check if any new env vars are different
    for (const [key, value] of newEnvMap.entries()) {
      const currentValue = currentEnvMap.get(key);
      if (currentValue !== value) {
        console.log(`Env var changed: ${key} = "${currentValue}" -> "${value}"`);
        return true;
      }
    }

    // Check if any custom env vars were removed
    for (const [key, value] of currentEnvMap.entries()) {
      if (!systemKeys.has(key) && !newEnvMap.has(key)) {
        console.log(`Env var removed: ${key} = "${value}"`);
        return true;
      }
    }

    return false;
  }

  /**
   * Recreate container with new environment variables
   * @returns The new container ID
   */
  private async recreateContainer(containerInfo: any, config: any): Promise<string> {
    const fs = require('fs');
    const path = require('path');

    const oldContainer = docker.getContainer(containerInfo.Id);
    const containerName = containerInfo.Name.replace(/^\//, '');
    const labels = containerInfo.Config.Labels || {};

    // Build new environment variables
    const env = [
      `ZEROCLAW_GATEWAY_PORT=${labels['openclaw.port'] || 42617}`,
      `ZEROCLAW_GATEWAY_HOST=0.0.0.0`,
      `ZEROCLAW_ALLOW_PUBLIC_BIND=true`,
    ];

    // Add custom environment variables from config
    if (config.runtime?.docker?.env && Array.isArray(config.runtime.docker.env)) {
      env.push(...config.runtime.docker.env);
    }

    // Preserve existing environment variables that aren't managed by us
    const existingEnv = containerInfo.Config.Env || [];
    const managedKeys = new Set(['ZEROCLAW_GATEWAY_PORT', 'ZEROCLAW_GATEWAY_HOST', 'ZEROCLAW_ALLOW_PUBLIC_BIND']);
    config.runtime?.docker?.env?.forEach((e: string) => {
      const eqIndex = e.indexOf('=');
      if (eqIndex > 0) {
        managedKeys.add(e.substring(0, eqIndex));
      }
    });

    existingEnv.forEach((envVar: string) => {
      const eqIndex = envVar.indexOf('=');
      if (eqIndex > 0) {
        const key = envVar.substring(0, eqIndex);
        if (!managedKeys.has(key)) {
          env.push(envVar);
        }
      }
    });

    // Get the config directory paths for Docker bind mount
    const mountConfigDir = path.join(MOUNT_WORKSPACE_ROOT, containerName);

    // Create new container config
    const newContainerConfig = {
      name: containerName,
      Image: containerInfo.Config.Image,
      Cmd: ['daemon'],
      User: containerInfo.Config.User,
      Env: env,
      ExposedPorts: containerInfo.Config.ExposedPorts,
      HostConfig: {
        PortBindings: containerInfo.HostConfig.PortBindings,
        Binds: [`${mountConfigDir}:/zeroclaw-data`],
        RestartPolicy: containerInfo.HostConfig.RestartPolicy,
        Memory: containerInfo.HostConfig.Memory,
        NanoCpus: containerInfo.HostConfig.NanoCpus,
      },
      Labels: labels,
    };

    // Stop and remove old container
    await oldContainer.stop({ t: 10 });
    await oldContainer.remove();

    // Create and start new container
    const newContainer = await docker.createContainer(newContainerConfig);
    await newContainer.start();

    return newContainer.id;
  }

  /**
   * Get logs from container
   */
  async getLogs(containerId: string, tail: number = 100): Promise<string> {
    try {
      const container = docker.getContainer(containerId);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail,
      });
      return logs.toString('utf-8');
    } catch (error) {
      console.error('Error getting logs:', error);
      return '';
    }
  }

  /**
   * Update container resource limits and port
   */
  async updateResourceLimits(
    containerId: string,
    memoryLimitMB?: number,
    cpuLimitCores?: number,
    port?: number
  ): Promise<boolean> {
    try {
      const container = docker.getContainer(containerId);
      const containerInfo = await container.inspect();
      const labels = containerInfo.Config.Labels || {};

      // Get current limits from labels
      const currentMemoryLimit = labels['openclaw.memoryLimit'] ? parseInt(labels['openclaw.memoryLimit']) : undefined;
      const currentCpuLimit = labels['openclaw.cpuLimit'] ? parseFloat(labels['openclaw.cpuLimit']) : undefined;
      const currentPort = labels['openclaw.port'] ? parseInt(labels['openclaw.port']) : undefined;

      // Get current limits from HostConfig for comparison
      const currentMemoryBytes = containerInfo.HostConfig.Memory;
      const currentCpuNanos = containerInfo.HostConfig.NanoCpus;

      // Calculate new limits
      const newMemoryMB = memoryLimitMB !== undefined ? memoryLimitMB : currentMemoryLimit;
      const newCpuCores = cpuLimitCores !== undefined ? cpuLimitCores : currentCpuLimit;
      const newPort = port !== undefined ? port : currentPort;

      // Check if limits actually changed
      const memoryChanged = newMemoryMB !== undefined && currentMemoryBytes !== undefined &&
        Math.abs(currentMemoryBytes - (newMemoryMB * 1024 * 1024)) > 1024; // Allow 1KB tolerance

      const cpuChanged = newCpuCores !== undefined && currentCpuNanos !== undefined &&
        Math.abs(currentCpuNanos - (newCpuCores * 1000000000)) > 1000000; // Allow 0.001 CPU tolerance

      const portChanged = newPort !== undefined && newPort !== currentPort;

      if (!memoryChanged && !cpuChanged && !portChanged) {
        console.log('Resource limits and port unchanged, skipping container recreation');
        return true;
      }

      console.log(`Resource settings changed - Memory: ${currentMemoryLimit}MB -> ${newMemoryMB}MB, CPU: ${currentCpuLimit} -> ${newCpuCores} cores, Port: ${currentPort} -> ${newPort}`);

      const newLimits: any = {};

      if (memoryChanged && newMemoryMB !== undefined) {
        newLimits.Memory = newMemoryMB * 1024 * 1024;
      }

      if (cpuChanged && newCpuCores !== undefined) {
        newLimits.NanoCpus = newCpuCores * 1000000000;
      }

      // Update container labels
      const newLabels = { ...labels };
      if (newMemoryMB !== undefined) {
        newLabels['openclaw.memoryLimit'] = newMemoryMB.toString();
      }
      if (newCpuCores !== undefined) {
        newLabels['openclaw.cpuLimit'] = newCpuCores.toString();
      }
      if (newPort !== undefined) {
        newLabels['openclaw.port'] = newPort.toString();
      } else if (port === undefined && currentPort !== undefined) {
        // Port was explicitly set to undefined (remove port binding)
        delete newLabels['openclaw.port'];
      }

      // Docker doesn't support updating resource limits on running containers
      // We need to recreate the container
      const containerName = containerInfo.Name.replace(/^\//, '');
      const mountConfigDir = path.join(MOUNT_WORKSPACE_ROOT, containerName);

      const wasRunning = containerInfo.State.Status === 'running';

      // Stop and remove old container
      await container.stop({ t: 10 });
      await container.remove();

      // Prepare ExposedPorts and PortBindings based on new port setting
      let newExposedPorts: any = undefined;
      let newPortBindings: any = undefined;

      if (newPort !== undefined) {
        // Set up port binding
        const portKey = `${newPort}/tcp`;
        newExposedPorts = {
          [portKey]: {}
        };
        newPortBindings = {
          [portKey]: [{ HostPort: newPort.toString() }]
        };
      }
      // If newPort is undefined, don't expose any ports (leave both undefined)

      // Create new container with updated limits and port configuration
      const newContainerConfig = {
        name: containerName,
        Image: containerInfo.Config.Image,
        Cmd: containerInfo.Config.Cmd,
        User: containerInfo.Config.User,
        Env: containerInfo.Config.Env,
        ExposedPorts: newExposedPorts,
        HostConfig: {
          Binds: [`${mountConfigDir}:/zeroclaw-data`],
          RestartPolicy: containerInfo.HostConfig.RestartPolicy,
          PortBindings: newPortBindings,
          ...newLimits,
        },
        Labels: newLabels,
      };

      const newContainer = await docker.createContainer(newContainerConfig);

      // Start if it was running before
      if (wasRunning) {
        await newContainer.start();
      }

      return true;
    } catch (error) {
      console.error('Error updating resource limits:', error);
      return false;
    }
  }

  private async pullImage(image: string): Promise<void> {
    return new Promise((resolve, reject) => {
      docker.pull(image, (err: Error, stream: NodeJS.ReadableStream) => {
        if (err) {
          reject(err);
          return;
        }

        stream.on('data', (chunk: Buffer) => {
          // Progress output
        });

        stream.on('end', () => resolve());
        stream.on('error', reject);
      });
    });
  }

  private async findAvailablePort(startPort: number = 42617): Promise<number> {
    const usedPorts = new Set<number>();

    try {
      const containers = await docker.listContainers();
      containers.forEach(c => {
        c.Ports.forEach(p => {
          if (p.PublicPort) {
            usedPorts.add(p.PublicPort);
          }
        });
      });
    } catch (error) {
      console.error('Error finding available port:', error);
    }

    let port = startPort;
    while (usedPorts.has(port) && port < 65535) {
      port++;
    }

    return port;
  }

  private extractPort(ports: any[]): number | undefined {
    const port = ports.find(p => p.PublicPort);
    return port?.PublicPort;
  }

  private extractPorts(ports: any): string[] {
    const result: string[] = [];
    Object.entries(ports).forEach(([key, value]: [string, any]) => {
      if (Array.isArray(value) && value.length > 0) {
        result.push(`${value[0].HostIp || '0.0.0.0'}:${value[0].HostPort}->${key}`);
      }
    });
    return result;
  }

  private mapContainerStatus(state: string): ZeroClawInstance['status'] {
    const statusMap: Record<string, ZeroClawInstance['status']> = {
      'running': 'running',
      'paused': 'paused',
      'restarting': 'restarting',
      'exited': 'stopped',
      'created': 'created',
    };
    return statusMap[state] || 'unknown';
  }

  private mergeConfig(defaultConfig: string, userConfig: any): any {
    const parsed = TOML.parse(defaultConfig) as any;
    return { ...parsed, ...userConfig };
  }

  private async getConfigFromContainer(containerInfo: any): Promise<any> {
    try {
      const fs = require('fs');
      const path = require('path');

      // First try to read from actual config file in workspace
      // Container name is the same as directory name (e.g., "openclaw-zeroagent")
      const containerName = containerInfo.Name.replace(/^\//, '');
      const configPath = path.join(WORKSPACE_ROOT, containerName, '.zeroclaw', 'config.toml');

      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        return TOML.parse(configContent);
      }

      // Fallback to labels if file doesn't exist
      const labels = containerInfo.Config.Labels || {};
      const configStr = labels['openclaw.config'];

      if (configStr) {
        return TOML.parse(configStr);
      }

      // Final fallback to default config
      return TOML.parse(DEFAULT_CONFIG);
    } catch (error) {
      console.error('Error reading config from container:', error);
      return TOML.parse(DEFAULT_CONFIG);
    }
  }

  /**
   * Apply configuration asynchronously after container is ready
   * This waits for the initial config file to be generated, then applies template config
   */
  private async applyConfigAsync(
    containerId: string,
    config: any,
    instanceDirName: string
  ): Promise<void> {
    const fs = require('fs');
    const path = require('path');
    const maxRetries = 30; // 30 retries * 2 seconds = 1 minute max wait
    let retries = 0;

    console.log(`[Async Config] Starting to apply config for container ${containerId.substring(0, 12)}`);

    try {
      // Wait for the initial config file to be created by the system
      const configPath = path.join(WORKSPACE_ROOT, instanceDirName, '.zeroclaw', 'config.toml');

      while (retries < maxRetries) {
        if (fs.existsSync(configPath)) {
          console.log(`[Async Config] Initial config file found at retry ${retries + 1}`);
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
        retries++;
      }

      if (retries >= maxRetries) {
        throw new Error('Initial config file was not created after 1 minute');
      }

      // Wait a bit more to ensure the file is fully written
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Read the current config
      const currentConfigContent = fs.readFileSync(configPath, 'utf-8');
      const currentConfig = TOML.parse(currentConfigContent) as any;

      // Merge template config with current config (template takes precedence)
      const mergedConfig = {
        ...currentConfig,
        ...config,
      };

      // Write the merged config back
      const newConfigContent = TOML.stringify(mergedConfig);
      fs.writeFileSync(configPath, newConfigContent, 'utf-8');

      console.log(`[Async Config] Successfully applied template config for container ${containerId.substring(0, 12)}`);

      // Restart the container to apply the new config
      try {
        const container = docker.getContainer(containerId);
        await container.restart();
        console.log(`[Async Config] Restarted container ${containerId.substring(0, 12)} to apply config`);
      } catch (restartError) {
        console.error(`[Async Config] Failed to restart container:`, restartError);
      }
    } catch (error) {
      console.error(`[Async Config] Failed to apply config for container ${containerId.substring(0, 12)}:`, error);
      throw error;
    }
  }

  /**
   * Get AGENTS.md file content for a container
   */
  async getAgentsFile(containerId: string): Promise<string> {
    try {
      const fs = require('fs');
      const path = require('path');

      const container = docker.getContainer(containerId);
      const containerInfo = await container.inspect();
      const containerName = containerInfo.Name.replace(/^\//, '');

      const agentsFilePath = path.join(WORKSPACE_ROOT, containerName, 'workspace/AGENTS.md');

      if (fs.existsSync(agentsFilePath)) {
        return fs.readFileSync(agentsFilePath, 'utf-8');
      }

      // Return empty string if file doesn't exist
      return '';
    } catch (error) {
      console.error('Error reading AGENTS.md:', error);
      throw error;
    }
  }

  /**
   * Save AGENTS.md file content for a container
   */
  async saveAgentsFile(containerId: string, content: string): Promise<void> {
    try {
      const fs = require('fs');
      const path = require('path');

      const container = docker.getContainer(containerId);
      const containerInfo = await container.inspect();
      const containerName = containerInfo.Name.replace(/^\//, '');

      const workspaceDir = path.join(WORKSPACE_ROOT, containerName);
      const agentsFilePath = path.join(workspaceDir, 'workspace/AGENTS.md');

      // Ensure workspace directory exists
      if (!fs.existsSync(workspaceDir)) {
        fs.mkdirSync(workspaceDir, { recursive: true });
      }

      // Write AGENTS.md file
      fs.writeFileSync(agentsFilePath, content, 'utf-8');
    } catch (error) {
      console.error('Error writing AGENTS.md:', error);
      throw error;
    }
  }

}


export const dockerService = new DockerService();
