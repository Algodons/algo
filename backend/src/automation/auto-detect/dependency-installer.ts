import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { FileScanner } from '../utils/file-scanner';
import { Logger } from '../utils/logger';

const execAsync = promisify(exec);

/**
 * Validate and sanitize project path to prevent directory traversal
 */
function validateProjectPath(projectPath: string): string {
  // Resolve to absolute path and normalize
  const resolvedPath = path.resolve(projectPath);
  
  // Basic validation - should be an absolute path
  if (!path.isAbsolute(resolvedPath)) {
    throw new Error('Project path must be absolute');
  }
  
  // Prevent directory traversal
  if (resolvedPath.includes('..')) {
    throw new Error('Invalid project path: directory traversal not allowed');
  }
  
  return resolvedPath;
}

export interface InstallResult {
  success: boolean;
  output: string;
  error?: string;
}

/**
 * Automatically install project dependencies
 */
export class DependencyInstaller {
  private fileScanner: FileScanner;
  private logger: Logger;

  constructor(logger?: Logger) {
    this.fileScanner = new FileScanner();
    this.logger = logger || new Logger();
  }

  /**
   * Install all dependencies for the project
   */
  async installDependencies(projectPath: string): Promise<InstallResult[]> {
    const results: InstallResult[] = [];

    // Node.js dependencies
    if (await this.fileScanner.fileExists(projectPath, 'package.json')) {
      this.logger.info('Installing Node.js dependencies...');
      const result = await this.installNodeDependencies(projectPath);
      results.push(result);
    }

    // Python dependencies
    if (await this.fileScanner.fileExists(projectPath, 'requirements.txt')) {
      this.logger.info('Installing Python dependencies...');
      const result = await this.installPythonDependencies(projectPath);
      results.push(result);
    }

    // Rust dependencies
    if (await this.fileScanner.fileExists(projectPath, 'Cargo.toml')) {
      this.logger.info('Installing Rust dependencies...');
      const result = await this.installRustDependencies(projectPath);
      results.push(result);
    }

    // Go dependencies
    if (await this.fileScanner.fileExists(projectPath, 'go.mod')) {
      this.logger.info('Installing Go dependencies...');
      const result = await this.installGoDependencies(projectPath);
      results.push(result);
    }

    // PHP dependencies
    if (await this.fileScanner.fileExists(projectPath, 'composer.json')) {
      this.logger.info('Installing PHP dependencies...');
      const result = await this.installPhpDependencies(projectPath);
      results.push(result);
    }

    return results;
  }

  /**
   * Install Node.js dependencies
   */
  private async installNodeDependencies(projectPath: string): Promise<InstallResult> {
    try {
      // Validate project path
      const safePath = validateProjectPath(projectPath);
      
      // Detect package manager
      let command = 'npm install';
      
      if (await this.fileScanner.fileExists(safePath, 'yarn.lock')) {
        command = 'yarn install';
      } else if (await this.fileScanner.fileExists(safePath, 'pnpm-lock.yaml')) {
        command = 'pnpm install';
      }

      this.logger.debug(`Running: ${command}`);
      const { stdout, stderr } = await execAsync(command, { 
        cwd: safePath,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      this.logger.success('Node.js dependencies installed successfully');
      return {
        success: true,
        output: stdout,
        error: stderr || undefined,
      };
    } catch (error: any) {
      this.logger.error('Failed to install Node.js dependencies:', error.message);
      return {
        success: false,
        output: error.stdout || '',
        error: error.message,
      };
    }
  }

  /**
   * Install Python dependencies
   */
  private async installPythonDependencies(projectPath: string): Promise<InstallResult> {
    try {
      const safePath = validateProjectPath(projectPath);
      let command = 'pip install -r requirements.txt';

      // Check for Pipenv
      if (await this.fileScanner.fileExists(safePath, 'Pipfile')) {
        command = 'pipenv install';
      }
      // Check for Poetry
      else if (await this.fileScanner.fileExists(safePath, 'pyproject.toml')) {
        command = 'poetry install';
      }

      this.logger.debug(`Running: ${command}`);
      const { stdout, stderr } = await execAsync(command, { 
        cwd: safePath,
        maxBuffer: 10 * 1024 * 1024,
      });

      this.logger.success('Python dependencies installed successfully');
      return {
        success: true,
        output: stdout,
        error: stderr || undefined,
      };
    } catch (error: any) {
      this.logger.error('Failed to install Python dependencies:', error.message);
      return {
        success: false,
        output: error.stdout || '',
        error: error.message,
      };
    }
  }

  /**
   * Install Rust dependencies
   */
  private async installRustDependencies(projectPath: string): Promise<InstallResult> {
    try {
      const safePath = validateProjectPath(projectPath);
      const command = 'cargo fetch';
      
      this.logger.debug(`Running: ${command}`);
      const { stdout, stderr } = await execAsync(command, { 
        cwd: safePath,
        maxBuffer: 10 * 1024 * 1024,
      });

      this.logger.success('Rust dependencies fetched successfully');
      return {
        success: true,
        output: stdout,
        error: stderr || undefined,
      };
    } catch (error: any) {
      this.logger.error('Failed to fetch Rust dependencies:', error.message);
      return {
        success: false,
        output: error.stdout || '',
        error: error.message,
      };
    }
  }

  /**
   * Install Go dependencies
   */
  private async installGoDependencies(projectPath: string): Promise<InstallResult> {
    try {
      const safePath = validateProjectPath(projectPath);
      const command = 'go mod download';
      
      this.logger.debug(`Running: ${command}`);
      const { stdout, stderr } = await execAsync(command, { 
        cwd: safePath,
        maxBuffer: 10 * 1024 * 1024,
      });

      this.logger.success('Go dependencies downloaded successfully');
      return {
        success: true,
        output: stdout,
        error: stderr || undefined,
      };
    } catch (error: any) {
      this.logger.error('Failed to download Go dependencies:', error.message);
      return {
        success: false,
        output: error.stdout || '',
        error: error.message,
      };
    }
  }

  /**
   * Install PHP dependencies
   */
  private async installPhpDependencies(projectPath: string): Promise<InstallResult> {
    try {
      const safePath = validateProjectPath(projectPath);
      const command = 'composer install';
      
      this.logger.debug(`Running: ${command}`);
      const { stdout, stderr } = await execAsync(command, { 
        cwd: safePath,
        maxBuffer: 10 * 1024 * 1024,
      });

      this.logger.success('PHP dependencies installed successfully');
      return {
        success: true,
        output: stdout,
        error: stderr || undefined,
      };
    } catch (error: any) {
      this.logger.error('Failed to install PHP dependencies:', error.message);
      return {
        success: false,
        output: error.stdout || '',
        error: error.message,
      };
    }
  }
}
