const Docker = require('dockerode');
const { logger } = require('../utils/logger');

const docker = new Docker({
  socketPath: process.env.DOCKER_HOST || '/var/run/docker.sock',
});

const containerRegistry = new Map(); // projectId -> containerId

const createContainer = async (projectId, language = 'javascript', userId) => {
  try {
    // Define language-specific images
    const images = {
      javascript: 'node:18-alpine',
      python: 'python:3.11-alpine',
      typescript: 'node:18-alpine',
      go: 'golang:1.21-alpine',
      rust: 'rust:1.75-alpine',
    };

    const image = images[language] || images.javascript;

    // Create container with resource limits
    const container = await docker.createContainer({
      Image: image,
      name: `algo-project-${projectId}`,
      Cmd: ['/bin/sh'],
      Tty: true,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      OpenStdin: true,
      StdinOnce: false,
      Env: [
        `PROJECT_ID=${projectId}`,
        `USER_ID=${userId}`,
      ],
      HostConfig: {
        Memory: 512 * 1024 * 1024, // 512MB
        MemorySwap: 512 * 1024 * 1024, // No swap
        NanoCpus: 500000000, // 0.5 CPU
        PidsLimit: 100,
        NetworkMode: 'bridge',
        ReadonlyRootfs: false,
        SecurityOpt: ['no-new-privileges'],
      },
      Labels: {
        'algo.project.id': projectId.toString(),
        'algo.user.id': userId.toString(),
      },
    });

    await container.start();

    containerRegistry.set(projectId, container.id);

    logger.info(`Container created for project ${projectId}: ${container.id}`);

    return container;
  } catch (error) {
    logger.error('Create container error:', error);
    throw error;
  }
};

const stopContainer = async (projectId) => {
  try {
    const containerId = containerRegistry.get(projectId);

    if (!containerId) {
      throw new Error('Container not found for project');
    }

    const container = docker.getContainer(containerId);
    await container.stop();
    await container.remove();

    containerRegistry.delete(projectId);

    logger.info(`Container stopped for project ${projectId}`);
  } catch (error) {
    logger.error('Stop container error:', error);
    throw error;
  }
};

const getContainerStats = async (projectId) => {
  try {
    const containerId = containerRegistry.get(projectId);

    if (!containerId) {
      return null;
    }

    const container = docker.getContainer(containerId);
    const stats = await container.stats({ stream: false });

    return {
      cpu: calculateCPUPercent(stats),
      memory: {
        used: stats.memory_stats.usage,
        limit: stats.memory_stats.limit,
        percent: (stats.memory_stats.usage / stats.memory_stats.limit) * 100,
      },
    };
  } catch (error) {
    logger.error('Get container stats error:', error);
    throw error;
  }
};

const calculateCPUPercent = (stats) => {
  if (
    !stats.precpu_stats ||
    !stats.precpu_stats.cpu_usage ||
    typeof stats.precpu_stats.cpu_usage.total_usage !== 'number' ||
    typeof stats.precpu_stats.system_cpu_usage !== 'number'
  ) {
    return 0;
  }
  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  if (systemDelta === 0) {
    return 0;
  }
  const cpuPercent = (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;
  return cpuPercent || 0;
};

const executeCommand = async (projectId, command) => {
  try {
    const containerId = containerRegistry.get(projectId);

    if (!containerId) {
      throw new Error('Container not found for project');
    }

    const container = docker.getContainer(containerId);

    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', command],
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start();

    return new Promise((resolve, reject) => {
      let output = '';

      stream.on('data', (data) => {
        output += data.toString();
      });

      stream.on('end', () => {
        resolve(output);
      });

      stream.on('error', reject);
    });
  } catch (error) {
    logger.error('Execute command error:', error);
    throw error;
  }
};

module.exports = {
  createContainer,
  stopContainer,
  getContainerStats,
  executeCommand,
};
