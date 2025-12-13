import { exec } from 'child_process';
import { promisify } from 'util';
import { FileScanner } from '../utils/file-scanner';
import { Logger } from '../utils/logger';

const execAsync = promisify(exec);

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
      // Detect package manager
      let command = 'npm install';
      
      if (await this.fileScanner.fileExists(projectPath, 'yarn.lock')) {
        command = 'yarn install';
      } else if (await this.fileScanner.fileExists(projectPath, 'pnpm-lock.yaml')) {
        command = 'pnpm install';
      }

      this.logger.debug(`Running: ${command}`);
      const { stdout, stderr } = await execAsync(command, { 
        cwd: projectPath,
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
      let command = 'pip install -r requirements.txt';

      // Check for Pipenv
      if (await this.fileScanner.fileExists(projectPath, 'Pipfile')) {
        command = 'pipenv install';
      }
      // Check for Poetry
      else if (await this.fileScanner.fileExists(projectPath, 'pyproject.toml')) {
        command = 'poetry install';
      }

      this.logger.debug(`Running: ${command}`);
      const { stdout, stderr } = await execAsync(command, { 
        cwd: projectPath,
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
      const command = 'cargo fetch';
      
      this.logger.debug(`Running: ${command}`);
      const { stdout, stderr } = await execAsync(command, { 
        cwd: projectPath,
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
      const command = 'go mod download';
      
      this.logger.debug(`Running: ${command}`);
      const { stdout, stderr } = await execAsync(command, { 
        cwd: projectPath,
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
      const command = 'composer install';
      
      this.logger.debug(`Running: ${command}`);
      const { stdout, stderr } = await execAsync(command, { 
        cwd: projectPath,
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
