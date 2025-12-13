import { FileScanner } from '../utils/file-scanner';
import { ConfigParser } from '../utils/config-parser';

export interface FrameworkInfo {
  type: 'frontend' | 'backend' | 'fullstack' | 'mobile' | 'unknown';
  name: string;
  version?: string;
  language: string;
  packageManager: string;
  dependencies: string[];
}

/**
 * Automatically detect frameworks used in a project
 */
export class FrameworkDetector {
  private fileScanner: FileScanner;
  private configParser: ConfigParser;

  constructor() {
    this.fileScanner = new FileScanner();
    this.configParser = new ConfigParser();
  }

  /**
   * Detect framework from project directory
   */
  async detectFramework(projectPath: string): Promise<FrameworkInfo[]> {
    const frameworks: FrameworkInfo[] = [];

    // Check for Node.js projects
    if (await this.fileScanner.fileExists(projectPath, 'package.json')) {
      const nodeFrameworks = await this.detectNodeFrameworks(projectPath);
      frameworks.push(...nodeFrameworks);
    }

    // Check for Python projects
    if (await this.fileScanner.fileExists(projectPath, 'requirements.txt')) {
      const pythonFrameworks = await this.detectPythonFrameworks(projectPath);
      frameworks.push(...pythonFrameworks);
    }

    // Check for Rust projects
    if (await this.fileScanner.fileExists(projectPath, 'Cargo.toml')) {
      const rustFrameworks = await this.detectRustFrameworks(projectPath);
      frameworks.push(...rustFrameworks);
    }

    // Check for Java projects
    if (await this.fileScanner.fileExists(projectPath, 'pom.xml')) {
      const javaFrameworks = await this.detectJavaFrameworks(projectPath);
      frameworks.push(...javaFrameworks);
    }

    // Check for Go projects
    if (await this.fileScanner.fileExists(projectPath, 'go.mod')) {
      const goFrameworks = await this.detectGoFrameworks(projectPath);
      frameworks.push(...goFrameworks);
    }

    // Check for PHP projects
    if (await this.fileScanner.fileExists(projectPath, 'composer.json')) {
      const phpFrameworks = await this.detectPhpFrameworks(projectPath);
      frameworks.push(...phpFrameworks);
    }

    return frameworks;
  }

  /**
   * Detect Node.js/JavaScript frameworks
   */
  private async detectNodeFrameworks(projectPath: string): Promise<FrameworkInfo[]> {
    const frameworks: FrameworkInfo[] = [];
    
    try {
      const packageJson = await this.fileScanner.readJsonFile(projectPath, 'package.json');
      const parsed = this.configParser.parsePackageJson(packageJson);
      
      const allDeps = { ...parsed.dependencies, ...parsed.devDependencies };
      const depKeys = Object.keys(allDeps);

      // Detect package manager
      let packageManager = 'npm';
      if (await this.fileScanner.fileExists(projectPath, 'yarn.lock')) {
        packageManager = 'yarn';
      } else if (await this.fileScanner.fileExists(projectPath, 'pnpm-lock.yaml')) {
        packageManager = 'pnpm';
      }

      // Frontend frameworks
      if (depKeys.includes('react')) {
        frameworks.push({
          type: 'frontend',
          name: 'React',
          version: allDeps['react'],
          language: 'JavaScript/TypeScript',
          packageManager,
          dependencies: depKeys,
        });
      }

      if (depKeys.includes('next')) {
        frameworks.push({
          type: 'fullstack',
          name: 'Next.js',
          version: allDeps['next'],
          language: 'JavaScript/TypeScript',
          packageManager,
          dependencies: depKeys,
        });
      }

      if (depKeys.includes('vue')) {
        frameworks.push({
          type: 'frontend',
          name: 'Vue',
          version: allDeps['vue'],
          language: 'JavaScript/TypeScript',
          packageManager,
          dependencies: depKeys,
        });
      }

      if (depKeys.includes('nuxt')) {
        frameworks.push({
          type: 'fullstack',
          name: 'Nuxt',
          version: allDeps['nuxt'],
          language: 'JavaScript/TypeScript',
          packageManager,
          dependencies: depKeys,
        });
      }

      if (depKeys.includes('@angular/core')) {
        frameworks.push({
          type: 'frontend',
          name: 'Angular',
          version: allDeps['@angular/core'],
          language: 'TypeScript',
          packageManager,
          dependencies: depKeys,
        });
      }

      if (depKeys.includes('svelte')) {
        frameworks.push({
          type: 'frontend',
          name: 'Svelte',
          version: allDeps['svelte'],
          language: 'JavaScript/TypeScript',
          packageManager,
          dependencies: depKeys,
        });
      }

      if (depKeys.includes('gatsby')) {
        frameworks.push({
          type: 'fullstack',
          name: 'Gatsby',
          version: allDeps['gatsby'],
          language: 'JavaScript/TypeScript',
          packageManager,
          dependencies: depKeys,
        });
      }

      // Backend frameworks
      if (depKeys.includes('express')) {
        frameworks.push({
          type: 'backend',
          name: 'Express',
          version: allDeps['express'],
          language: 'JavaScript/TypeScript',
          packageManager,
          dependencies: depKeys,
        });
      }

      if (depKeys.includes('fastify')) {
        frameworks.push({
          type: 'backend',
          name: 'Fastify',
          version: allDeps['fastify'],
          language: 'JavaScript/TypeScript',
          packageManager,
          dependencies: depKeys,
        });
      }

      if (depKeys.includes('@nestjs/core')) {
        frameworks.push({
          type: 'backend',
          name: 'NestJS',
          version: allDeps['@nestjs/core'],
          language: 'TypeScript',
          packageManager,
          dependencies: depKeys,
        });
      }

      // Mobile frameworks
      if (depKeys.includes('react-native')) {
        frameworks.push({
          type: 'mobile',
          name: 'React Native',
          version: allDeps['react-native'],
          language: 'JavaScript/TypeScript',
          packageManager,
          dependencies: depKeys,
        });
      }

      if (depKeys.includes('expo')) {
        frameworks.push({
          type: 'mobile',
          name: 'Expo',
          version: allDeps['expo'],
          language: 'JavaScript/TypeScript',
          packageManager,
          dependencies: depKeys,
        });
      }
    } catch (error) {
      // Failed to detect Node frameworks
    }

    return frameworks;
  }

  /**
   * Detect Python frameworks
   */
  private async detectPythonFrameworks(projectPath: string): Promise<FrameworkInfo[]> {
    const frameworks: FrameworkInfo[] = [];
    
    try {
      const requirementsTxt = await this.fileScanner.readTextFile(projectPath, 'requirements.txt');
      const dependencies = this.configParser.parseRequirementsTxt(requirementsTxt);

      const packageManager = await this.fileScanner.fileExists(projectPath, 'Pipfile') 
        ? 'pipenv' 
        : await this.fileScanner.fileExists(projectPath, 'poetry.lock')
        ? 'poetry'
        : 'pip';

      if (dependencies.includes('django') || dependencies.includes('Django')) {
        frameworks.push({
          type: 'fullstack',
          name: 'Django',
          language: 'Python',
          packageManager,
          dependencies,
        });
      }

      if (dependencies.includes('flask') || dependencies.includes('Flask')) {
        frameworks.push({
          type: 'backend',
          name: 'Flask',
          language: 'Python',
          packageManager,
          dependencies,
        });
      }

      if (dependencies.includes('fastapi') || dependencies.includes('FastAPI')) {
        frameworks.push({
          type: 'backend',
          name: 'FastAPI',
          language: 'Python',
          packageManager,
          dependencies,
        });
      }
    } catch (error) {
      // Failed to detect Python frameworks
    }

    return frameworks;
  }

  /**
   * Detect Rust frameworks
   */
  private async detectRustFrameworks(projectPath: string): Promise<FrameworkInfo[]> {
    const frameworks: FrameworkInfo[] = [];
    
    try {
      const cargoToml = await this.fileScanner.readTextFile(projectPath, 'Cargo.toml');
      const parsed = this.configParser.parseCargoToml(cargoToml);

      if (parsed.dependencies.includes('actix-web')) {
        frameworks.push({
          type: 'backend',
          name: 'Actix',
          language: 'Rust',
          packageManager: 'cargo',
          dependencies: parsed.dependencies,
        });
      }

      if (parsed.dependencies.includes('rocket')) {
        frameworks.push({
          type: 'backend',
          name: 'Rocket',
          language: 'Rust',
          packageManager: 'cargo',
          dependencies: parsed.dependencies,
        });
      }

      if (parsed.dependencies.includes('axum')) {
        frameworks.push({
          type: 'backend',
          name: 'Axum',
          language: 'Rust',
          packageManager: 'cargo',
          dependencies: parsed.dependencies,
        });
      }
    } catch (error) {
      // Failed to detect Rust frameworks
    }

    return frameworks;
  }

  /**
   * Detect Java frameworks
   */
  private async detectJavaFrameworks(projectPath: string): Promise<FrameworkInfo[]> {
    const frameworks: FrameworkInfo[] = [];
    
    try {
      const pomXml = await this.fileScanner.readTextFile(projectPath, 'pom.xml');

      const packageManager = await this.fileScanner.fileExists(projectPath, 'build.gradle')
        ? 'gradle'
        : 'maven';

      if (pomXml.includes('spring-boot')) {
        frameworks.push({
          type: 'backend',
          name: 'Spring Boot',
          language: 'Java',
          packageManager,
          dependencies: [],
        });
      }
    } catch (error) {
      // Failed to detect Java frameworks
    }

    return frameworks;
  }

  /**
   * Detect Go frameworks
   */
  private async detectGoFrameworks(projectPath: string): Promise<FrameworkInfo[]> {
    const frameworks: FrameworkInfo[] = [];
    
    try {
      const goMod = await this.fileScanner.readTextFile(projectPath, 'go.mod');
      const parsed = this.configParser.parseGoMod(goMod);

      if (parsed.dependencies.some(dep => dep.includes('gin-gonic/gin'))) {
        frameworks.push({
          type: 'backend',
          name: 'Gin',
          language: 'Go',
          packageManager: 'go',
          dependencies: parsed.dependencies,
        });
      }

      if (parsed.dependencies.some(dep => dep.includes('gofiber/fiber'))) {
        frameworks.push({
          type: 'backend',
          name: 'Fiber',
          language: 'Go',
          packageManager: 'go',
          dependencies: parsed.dependencies,
        });
      }

      if (parsed.dependencies.some(dep => dep.includes('gorilla/mux'))) {
        frameworks.push({
          type: 'backend',
          name: 'Gorilla Mux',
          language: 'Go',
          packageManager: 'go',
          dependencies: parsed.dependencies,
        });
      }
    } catch (error) {
      // Failed to detect Go frameworks
    }

    return frameworks;
  }

  /**
   * Detect PHP frameworks
   */
  private async detectPhpFrameworks(projectPath: string): Promise<FrameworkInfo[]> {
    const frameworks: FrameworkInfo[] = [];
    
    try {
      const composerJson = await this.fileScanner.readJsonFile(projectPath, 'composer.json');
      const parsed = this.configParser.parseComposerJson(composerJson);

      const requireKeys = Object.keys(parsed.require);

      if (requireKeys.some(key => key.includes('laravel/framework'))) {
        frameworks.push({
          type: 'fullstack',
          name: 'Laravel',
          language: 'PHP',
          packageManager: 'composer',
          dependencies: requireKeys,
        });
      }

      if (requireKeys.some(key => key.includes('symfony/framework-bundle'))) {
        frameworks.push({
          type: 'fullstack',
          name: 'Symfony',
          language: 'PHP',
          packageManager: 'composer',
          dependencies: requireKeys,
        });
      }
    } catch (error) {
      // Failed to detect PHP frameworks
    }

    return frameworks;
  }
}
