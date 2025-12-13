import { FileScanner } from '../utils/file-scanner';
import { ConfigParser } from '../utils/config-parser';
import { FrameworkInfo } from './framework-detector';

export interface PortConfiguration {
  port: number;
  service: string;
  isDefault: boolean;
}

/**
 * Detect ports used by the application and configure proxy
 */
export class PortDetector {
  private fileScanner: FileScanner;
  private configParser: ConfigParser;

  // Default ports for common frameworks
  private readonly defaultPorts: Record<string, number> = {
    'React': 3000,
    'Next.js': 3000,
    'Vue': 8080,
    'Nuxt': 3000,
    'Angular': 4200,
    'Svelte': 5000,
    'Gatsby': 8000,
    'Express': 3000,
    'Fastify': 3000,
    'NestJS': 3000,
    'Django': 8000,
    'Flask': 5000,
    'FastAPI': 8000,
    'Actix': 8080,
    'Rocket': 8000,
    'Axum': 3000,
    'Spring Boot': 8080,
    'Gin': 8080,
    'Fiber': 3000,
    'Laravel': 8000,
    'Symfony': 8000,
  };

  constructor() {
    this.fileScanner = new FileScanner();
    this.configParser = new ConfigParser();
  }

  /**
   * Detect all ports used in the project
   */
  async detectPorts(
    projectPath: string,
    frameworks: FrameworkInfo[]
  ): Promise<PortConfiguration[]> {
    const ports: PortConfiguration[] = [];
    const detectedPorts = new Set<number>();

    // Add default ports for detected frameworks
    for (const framework of frameworks) {
      const defaultPort = this.defaultPorts[framework.name];
      if (defaultPort && !detectedPorts.has(defaultPort)) {
        ports.push({
          port: defaultPort,
          service: framework.name,
          isDefault: true,
        });
        detectedPorts.add(defaultPort);
      }
    }

    // Scan configuration files for port definitions
    const configPorts = await this.scanConfigFiles(projectPath);
    for (const port of configPorts) {
      if (!detectedPorts.has(port)) {
        ports.push({
          port,
          service: 'Custom',
          isDefault: false,
        });
        detectedPorts.add(port);
      }
    }

    // Scan source files for port usage
    const sourcePorts = await this.scanSourceFiles(projectPath);
    for (const port of sourcePorts) {
      if (!detectedPorts.has(port)) {
        ports.push({
          port,
          service: 'Custom',
          isDefault: false,
        });
        detectedPorts.add(port);
      }
    }

    return ports.sort((a, b) => a.port - b.port);
  }

  /**
   * Scan configuration files for port definitions
   */
  private async scanConfigFiles(projectPath: string): Promise<number[]> {
    const ports: number[] = [];

    // Check .env files
    const envFiles = ['.env', '.env.example', '.env.local', '.env.development'];
    for (const envFile of envFiles) {
      if (await this.fileScanner.fileExists(projectPath, envFile)) {
        try {
          const content = await this.fileScanner.readTextFile(projectPath, envFile);
          const foundPorts = this.configParser.extractPorts(content);
          ports.push(...foundPorts);
        } catch {
          // Skip files we can't read
        }
      }
    }

    // Check config files
    const configFiles = ['config.json', 'config.js', 'app.json'];
    for (const configFile of configFiles) {
      if (await this.fileScanner.fileExists(projectPath, configFile)) {
        try {
          const content = await this.fileScanner.readTextFile(projectPath, configFile);
          const foundPorts = this.configParser.extractPorts(content);
          ports.push(...foundPorts);
        } catch {
          // Skip files we can't read
        }
      }
    }

    // Check docker-compose.yml
    if (await this.fileScanner.fileExists(projectPath, 'docker-compose.yml')) {
      try {
        const content = await this.fileScanner.readTextFile(projectPath, 'docker-compose.yml');
        const foundPorts = this.configParser.extractPorts(content);
        ports.push(...foundPorts);
      } catch {
        // Skip files we can't read
      }
    }

    return Array.from(new Set(ports));
  }

  /**
   * Scan source files for port usage
   */
  private async scanSourceFiles(projectPath: string): Promise<number[]> {
    const ports: number[] = [];

    try {
      // Search in common source file extensions
      const extensions = ['.js', '.ts', '.py', '.rs', '.go', '.java', '.php'];
      const files = await this.fileScanner.listFiles(projectPath);

      for (const file of files) {
        const ext = file.substring(file.lastIndexOf('.'));
        if (!extensions.includes(ext)) continue;

        try {
          const content = await this.fileScanner.readTextFile(projectPath, file);
          const foundPorts = this.configParser.extractPorts(content);
          ports.push(...foundPorts);
        } catch {
          // Skip files we can't read
        }
      }
    } catch {
      // Failed to scan source files
    }

    return Array.from(new Set(ports));
  }

  /**
   * Generate nginx proxy configuration
   */
  generateNginxProxyConfig(ports: PortConfiguration[], domain: string): string {
    const configs: string[] = [];

    for (const portConfig of ports) {
      const serviceName = portConfig.service.toLowerCase().replace(/\s+/g, '-');
      const subdomain = portConfig.isDefault ? domain : `${serviceName}.${domain}`;

      configs.push(`
# Proxy configuration for ${portConfig.service} on port ${portConfig.port}
server {
    listen 80;
    server_name ${subdomain};

    location / {
        proxy_pass http://localhost:${portConfig.port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`);
    }

    return configs.join('\n');
  }
}
