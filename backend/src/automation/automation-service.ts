import { FrameworkDetector } from './auto-detect/framework-detector';
import { BuildCommandInferrer } from './auto-detect/build-command-inferrer';
import { PortDetector } from './auto-detect/port-detector';
import { DependencyInstaller } from './auto-detect/dependency-installer';
import { DockerfileGenerator } from './iac/dockerfile-generator';
import { KubernetesGenerator } from './iac/kubernetes-generator';
import { NginxGenerator } from './iac/nginx-generator';
import { TerraformGenerator } from './iac/terraform-generator';
import { TemplateManager } from './templates/template-manager';
import { Logger } from './utils/logger';

export interface AutoDetectResult {
  frameworks: any[];
  commands: any;
  ports: any[];
}

export interface IaCResult {
  dockerfile: string;
  kubernetes: any;
  nginx: string;
  terraform?: string;
}

/**
 * Main automation service that orchestrates all automation features
 */
export class AutomationService {
  private frameworkDetector: FrameworkDetector;
  private buildCommandInferrer: BuildCommandInferrer;
  private portDetector: PortDetector;
  private dependencyInstaller: DependencyInstaller;
  private dockerfileGenerator: DockerfileGenerator;
  private kubernetesGenerator: KubernetesGenerator;
  private nginxGenerator: NginxGenerator;
  private terraformGenerator: TerraformGenerator;
  private templateManager: TemplateManager;
  private logger: Logger;

  constructor(templatesDir: string = '/templates', debugMode: boolean = false) {
    this.logger = new Logger(debugMode);
    this.frameworkDetector = new FrameworkDetector();
    this.buildCommandInferrer = new BuildCommandInferrer();
    this.portDetector = new PortDetector();
    this.dependencyInstaller = new DependencyInstaller(this.logger);
    this.dockerfileGenerator = new DockerfileGenerator();
    this.kubernetesGenerator = new KubernetesGenerator();
    this.nginxGenerator = new NginxGenerator();
    this.terraformGenerator = new TerraformGenerator();
    this.templateManager = new TemplateManager(templatesDir, this.logger);
  }

  /**
   * Auto-detect project configuration
   */
  async autoDetect(projectPath: string): Promise<AutoDetectResult> {
    this.logger.info('Starting auto-detection...');

    // Detect frameworks
    const frameworks = await this.frameworkDetector.detectFramework(projectPath);
    this.logger.info(`Detected ${frameworks.length} framework(s)`);

    // Infer build commands
    const commands = await this.buildCommandInferrer.inferCommands(projectPath, frameworks);
    this.logger.info('Build commands inferred');

    // Detect ports
    const ports = await this.portDetector.detectPorts(projectPath, frameworks);
    this.logger.info(`Detected ${ports.length} port(s)`);

    return {
      frameworks,
      commands,
      ports,
    };
  }

  /**
   * Install project dependencies
   */
  async installDependencies(projectPath: string): Promise<any> {
    this.logger.info('Installing dependencies...');
    const results = await this.dependencyInstaller.installDependencies(projectPath);
    
    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };

    this.logger.info(`Dependencies installation completed: ${summary.successful}/${summary.total} successful`);
    return summary;
  }

  /**
   * Generate Infrastructure as Code
   */
  async generateIaC(
    projectPath: string,
    domain?: string,
    cloudProvider?: 'aws' | 'digitalocean'
  ): Promise<IaCResult> {
    this.logger.info('Generating Infrastructure as Code...');

    // First, detect project configuration
    const { frameworks, commands, ports } = await this.autoDetect(projectPath);

    // Generate Dockerfile
    const dockerfile = this.dockerfileGenerator.generateDockerfile(frameworks, commands, ports);
    this.logger.debug('Dockerfile generated');

    // Generate Kubernetes manifests
    const appName = projectPath.split('/').pop() || 'app';
    const kubernetes = this.kubernetesGenerator.generateManifests(appName, frameworks, ports, domain);
    this.logger.debug('Kubernetes manifests generated');

    // Generate nginx config
    const nginx = domain 
      ? this.nginxGenerator.generateConfig(domain, ports, true)
      : this.nginxGenerator.generateConfig('localhost', ports, false);
    this.logger.debug('nginx configuration generated');

    // Generate Terraform if cloud provider specified
    let terraform: string | undefined;
    if (cloudProvider) {
      if (cloudProvider === 'aws') {
        terraform = this.terraformGenerator.generateAWS(appName);
      } else if (cloudProvider === 'digitalocean') {
        terraform = this.terraformGenerator.generateDigitalOcean(appName);
      }
      this.logger.debug('Terraform configuration generated');
    }

    this.logger.success('Infrastructure as Code generated successfully');

    return {
      dockerfile,
      kubernetes,
      nginx,
      terraform,
    };
  }

  /**
   * Get available templates
   */
  async getTemplates(): Promise<any[]> {
    return this.templateManager.getAvailableTemplates();
  }

  /**
   * Initialize project from template
   */
  async initializeFromTemplate(
    templateName: string,
    targetDir: string,
    customization?: any
  ): Promise<void> {
    this.logger.info(`Initializing project from template: ${templateName}`);
    await this.templateManager.initializeTemplate(templateName, targetDir, customization);
    this.logger.success('Project initialized from template');
  }

  /**
   * Import project from GitHub
   */
  async importFromGitHub(repoUrl: string, targetDir: string): Promise<void> {
    this.logger.info(`Importing project from GitHub: ${repoUrl}`);
    await this.templateManager.importFromGitHub(repoUrl, targetDir);
    this.logger.success('Project imported from GitHub');
  }

  /**
   * Full project setup: detect, install, and generate IaC
   */
  async setupProject(
    projectPath: string,
    options: {
      installDependencies?: boolean;
      generateIaC?: boolean;
      domain?: string;
      cloudProvider?: 'aws' | 'digitalocean';
    } = {}
  ): Promise<{
    detection: AutoDetectResult;
    installation?: any;
    iac?: IaCResult;
  }> {
    this.logger.info('Starting full project setup...');

    // Auto-detect
    const detection = await this.autoDetect(projectPath);

    // Install dependencies if requested
    let installation;
    if (options.installDependencies) {
      installation = await this.installDependencies(projectPath);
    }

    // Generate IaC if requested
    let iac;
    if (options.generateIaC) {
      iac = await this.generateIaC(projectPath, options.domain, options.cloudProvider);
    }

    this.logger.success('Project setup completed successfully');

    return {
      detection,
      installation,
      iac,
    };
  }
}
