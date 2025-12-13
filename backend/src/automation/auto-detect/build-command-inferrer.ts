import { FileScanner } from '../utils/file-scanner';
import { FrameworkInfo } from './framework-detector';

export interface BuildCommands {
  install: string[];
  build: string[];
  start: string[];
  test: string[];
  dev: string[];
}

/**
 * Automatically infer build commands based on project configuration
 */
export class BuildCommandInferrer {
  private fileScanner: FileScanner;

  constructor() {
    this.fileScanner = new FileScanner();
  }

  /**
   * Infer build commands from project and framework info
   */
  async inferCommands(
    projectPath: string,
    frameworks: FrameworkInfo[]
  ): Promise<BuildCommands> {
    const commands: BuildCommands = {
      install: [],
      build: [],
      start: [],
      test: [],
      dev: [],
    };

    // Check for Node.js projects
    if (await this.fileScanner.fileExists(projectPath, 'package.json')) {
      const nodeCommands = await this.inferNodeCommands(projectPath);
      this.mergeCommands(commands, nodeCommands);
    }

    // Check for Python projects
    if (await this.fileScanner.fileExists(projectPath, 'requirements.txt')) {
      const pythonCommands = await this.inferPythonCommands(projectPath, frameworks);
      this.mergeCommands(commands, pythonCommands);
    }

    // Check for Rust projects
    if (await this.fileScanner.fileExists(projectPath, 'Cargo.toml')) {
      const rustCommands = this.inferRustCommands();
      this.mergeCommands(commands, rustCommands);
    }

    // Check for Java projects
    if (await this.fileScanner.fileExists(projectPath, 'pom.xml')) {
      const javaCommands = await this.inferJavaCommands(projectPath);
      this.mergeCommands(commands, javaCommands);
    }

    // Check for Go projects
    if (await this.fileScanner.fileExists(projectPath, 'go.mod')) {
      const goCommands = this.inferGoCommands();
      this.mergeCommands(commands, goCommands);
    }

    // Check for PHP projects
    if (await this.fileScanner.fileExists(projectPath, 'composer.json')) {
      const phpCommands = this.inferPhpCommands();
      this.mergeCommands(commands, phpCommands);
    }

    return commands;
  }

  /**
   * Infer commands for Node.js projects
   */
  private async inferNodeCommands(projectPath: string): Promise<BuildCommands> {
    const commands: BuildCommands = {
      install: [],
      build: [],
      start: [],
      test: [],
      dev: [],
    };

    try {
      const packageJson = await this.fileScanner.readJsonFile(projectPath, 'package.json');
      const scripts = packageJson.scripts || {};

      // Determine package manager
      let packageManager = 'npm';
      if (await this.fileScanner.fileExists(projectPath, 'yarn.lock')) {
        packageManager = 'yarn';
      } else if (await this.fileScanner.fileExists(projectPath, 'pnpm-lock.yaml')) {
        packageManager = 'pnpm';
      }

      // Install command
      if (packageManager === 'yarn') {
        commands.install.push('yarn install');
      } else if (packageManager === 'pnpm') {
        commands.install.push('pnpm install');
      } else {
        commands.install.push('npm install');
      }

      // Build command
      if (scripts.build) {
        commands.build.push(`${packageManager === 'npm' ? 'npm run' : packageManager} build`);
      }

      // Start command
      if (scripts.start) {
        commands.start.push(`${packageManager === 'npm' ? 'npm run' : packageManager} start`);
      } else if (scripts.serve) {
        commands.start.push(`${packageManager === 'npm' ? 'npm run' : packageManager} serve`);
      }

      // Test command
      if (scripts.test) {
        commands.test.push(`${packageManager === 'npm' ? 'npm run' : packageManager} test`);
      }

      // Dev command
      if (scripts.dev) {
        commands.dev.push(`${packageManager === 'npm' ? 'npm run' : packageManager} dev`);
      } else if (scripts['dev:server']) {
        commands.dev.push(`${packageManager === 'npm' ? 'npm run' : packageManager} dev:server`);
      }
    } catch (error) {
      // Use defaults
      commands.install.push('npm install');
    }

    return commands;
  }

  /**
   * Infer commands for Python projects
   */
  private async inferPythonCommands(
    projectPath: string,
    frameworks: FrameworkInfo[]
  ): Promise<BuildCommands> {
    const commands: BuildCommands = {
      install: [],
      build: [],
      start: [],
      test: [],
      dev: [],
    };

    // Determine package manager
    let installCmd = 'pip install -r requirements.txt';
    if (await this.fileScanner.fileExists(projectPath, 'Pipfile')) {
      installCmd = 'pipenv install';
    } else if (await this.fileScanner.fileExists(projectPath, 'pyproject.toml')) {
      installCmd = 'poetry install';
    }

    commands.install.push(installCmd);

    // Check for setup.py
    if (await this.fileScanner.fileExists(projectPath, 'setup.py')) {
      commands.build.push('python setup.py build');
    }

    // Framework-specific commands
    const djangoFramework = frameworks.find(f => f.name === 'Django');
    if (djangoFramework) {
      commands.start.push('python manage.py runserver');
      commands.dev.push('python manage.py runserver');
      commands.test.push('python manage.py test');
    }

    const flaskFramework = frameworks.find(f => f.name === 'Flask');
    if (flaskFramework) {
      commands.start.push('flask run');
      commands.dev.push('flask run --debug');
    }

    const fastapiFramework = frameworks.find(f => f.name === 'FastAPI');
    if (fastapiFramework) {
      commands.start.push('uvicorn main:app');
      commands.dev.push('uvicorn main:app --reload');
    }

    // Generic test command
    if (commands.test.length === 0) {
      commands.test.push('pytest');
    }

    return commands;
  }

  /**
   * Infer commands for Rust projects
   */
  private inferRustCommands(): BuildCommands {
    return {
      install: ['cargo fetch'],
      build: ['cargo build --release'],
      start: ['cargo run --release'],
      test: ['cargo test'],
      dev: ['cargo run'],
    };
  }

  /**
   * Infer commands for Java projects
   */
  private async inferJavaCommands(projectPath: string): Promise<BuildCommands> {
    const commands: BuildCommands = {
      install: [],
      build: [],
      start: [],
      test: [],
      dev: [],
    };

    const isGradle = await this.fileScanner.fileExists(projectPath, 'build.gradle');

    if (isGradle) {
      commands.install.push('./gradlew dependencies');
      commands.build.push('./gradlew build');
      commands.start.push('./gradlew bootRun');
      commands.test.push('./gradlew test');
      commands.dev.push('./gradlew bootRun');
    } else {
      commands.install.push('mvn install');
      commands.build.push('mvn package');
      commands.start.push('mvn spring-boot:run');
      commands.test.push('mvn test');
      commands.dev.push('mvn spring-boot:run');
    }

    return commands;
  }

  /**
   * Infer commands for Go projects
   */
  private inferGoCommands(): BuildCommands {
    return {
      install: ['go mod download'],
      build: ['go build -o main .'],
      start: ['./main'],
      test: ['go test ./...'],
      dev: ['go run .'],
    };
  }

  /**
   * Infer commands for PHP projects
   */
  private inferPhpCommands(): BuildCommands {
    return {
      install: ['composer install'],
      build: [],
      start: ['php -S localhost:8000'],
      test: ['./vendor/bin/phpunit'],
      dev: ['php artisan serve'],
    };
  }

  /**
   * Merge commands from different sources
   */
  private mergeCommands(target: BuildCommands, source: BuildCommands): void {
    target.install.push(...source.install);
    target.build.push(...source.build);
    target.start.push(...source.start);
    target.test.push(...source.test);
    target.dev.push(...source.dev);
  }
}
