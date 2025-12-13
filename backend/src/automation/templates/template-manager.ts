import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface TemplateConfig {
  name: string;
  description: string;
  type: 'frontend' | 'backend' | 'fullstack' | 'mobile' | 'devops';
  language: string;
  framework: string;
  features: string[];
  gitRepo?: string;
  defaultPort?: number;
}

export interface TemplateCustomization {
  projectName: string;
  features: string[];
  addAuth?: boolean;
  addDatabase?: boolean;
  databaseType?: 'postgres' | 'mysql' | 'mongodb';
  addTesting?: boolean;
  addDocker?: boolean;
  envVars?: Record<string, string>;
}

/**
 * Manage project templates
 */
export class TemplateManager {
  private logger: Logger;

  constructor(_templatesDir: string, logger?: Logger) {
    this.logger = logger || new Logger();
  }

  /**
   * Get all available templates
   */
  async getAvailableTemplates(): Promise<TemplateConfig[]> {
    const templates: TemplateConfig[] = [
      // Frontend templates
      {
        name: 'react-typescript',
        description: 'React with TypeScript and Vite',
        type: 'frontend',
        language: 'TypeScript',
        framework: 'React',
        features: ['Vite', 'TypeScript', 'ESLint', 'Prettier'],
        defaultPort: 5173,
      },
      {
        name: 'nextjs-app',
        description: 'Next.js 14 with App Router',
        type: 'fullstack',
        language: 'TypeScript',
        framework: 'Next.js',
        features: ['App Router', 'TypeScript', 'Tailwind CSS'],
        defaultPort: 3000,
      },
      {
        name: 'vue-vite',
        description: 'Vue 3 with Vite and TypeScript',
        type: 'frontend',
        language: 'TypeScript',
        framework: 'Vue',
        features: ['Vite', 'TypeScript', 'Vue Router', 'Pinia'],
        defaultPort: 5173,
      },

      // Backend templates
      {
        name: 'express-api',
        description: 'Express REST API with TypeScript',
        type: 'backend',
        language: 'TypeScript',
        framework: 'Express',
        features: ['TypeScript', 'JWT Auth', 'Validation'],
        defaultPort: 3000,
      },
      {
        name: 'fastapi-rest',
        description: 'FastAPI REST API with Python',
        type: 'backend',
        language: 'Python',
        framework: 'FastAPI',
        features: ['Async', 'Pydantic', 'SQLAlchemy'],
        defaultPort: 8000,
      },
      {
        name: 'nestjs-api',
        description: 'NestJS REST API with TypeScript',
        type: 'backend',
        language: 'TypeScript',
        framework: 'NestJS',
        features: ['TypeScript', 'Dependency Injection', 'TypeORM'],
        defaultPort: 3000,
      },

      // Fullstack templates
      {
        name: 'mern-stack',
        description: 'MongoDB, Express, React, Node.js',
        type: 'fullstack',
        language: 'JavaScript',
        framework: 'MERN',
        features: ['MongoDB', 'Express', 'React', 'Node.js'],
        defaultPort: 3000,
      },
      {
        name: 't3-stack',
        description: 'Next.js, tRPC, Prisma, TypeScript',
        type: 'fullstack',
        language: 'TypeScript',
        framework: 'T3 Stack',
        features: ['Next.js', 'tRPC', 'Prisma', 'NextAuth'],
        defaultPort: 3000,
      },
    ];

    return templates;
  }

  /**
   * Initialize project from template
   */
  async initializeTemplate(
    templateName: string,
    targetDir: string,
    customization?: TemplateCustomization
  ): Promise<void> {
    const templates = await this.getAvailableTemplates();
    const template = templates.find(t => t.name === templateName);

    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    this.logger.info(`Initializing ${template.name} template...`);

    // Create project based on template type
    await this.createProject(template, targetDir, customization);

    this.logger.success(`Template ${templateName} initialized successfully`);
  }

  /**
   * Create project from template
   */
  private async createProject(
    template: TemplateConfig,
    targetDir: string,
    customization?: TemplateCustomization
  ): Promise<void> {
    // Create target directory
    await fs.mkdir(targetDir, { recursive: true });

    // Use scaffolding tools based on framework
    switch (template.framework) {
      case 'React':
        await this.createReactProject(targetDir, customization);
        break;
      case 'Next.js':
        await this.createNextProject(targetDir, customization);
        break;
      case 'Vue':
        await this.createVueProject(targetDir, customization);
        break;
      case 'Express':
        await this.createExpressProject(targetDir, customization);
        break;
      case 'FastAPI':
        await this.createFastAPIProject(targetDir, customization);
        break;
      case 'NestJS':
        await this.createNestJSProject(targetDir, customization);
        break;
      default:
        throw new Error(`Framework ${template.framework} not supported`);
    }

    // Apply customizations
    if (customization) {
      await this.applyCustomizations(targetDir, template, customization);
    }
  }

  /**
   * Create React project
   */
  private async createReactProject(targetDir: string, customization?: TemplateCustomization): Promise<void> {
    const projectName = customization?.projectName || 'my-app';
    await execAsync(`npm create vite@latest ${projectName} -- --template react-ts`, {
      cwd: path.dirname(targetDir),
    });
  }

  /**
   * Create Next.js project
   */
  private async createNextProject(targetDir: string, customization?: TemplateCustomization): Promise<void> {
    const projectName = customization?.projectName || 'my-app';
    await execAsync(`npx create-next-app@latest ${projectName} --typescript --tailwind --app --yes`, {
      cwd: path.dirname(targetDir),
    });
  }

  /**
   * Create Vue project
   */
  private async createVueProject(targetDir: string, customization?: TemplateCustomization): Promise<void> {
    const projectName = customization?.projectName || 'my-app';
    await execAsync(`npm create vue@latest ${projectName} -- --typescript --router --pinia`, {
      cwd: path.dirname(targetDir),
    });
  }

  /**
   * Create Express project
   */
  private async createExpressProject(targetDir: string, _customization?: TemplateCustomization): Promise<void> {
    const projectName = _customization?.projectName || 'my-app';
    
    // Create package.json
    const packageJson = {
      name: projectName,
      version: '1.0.0',
      description: 'Express API',
      main: 'dist/index.js',
      scripts: {
        dev: 'ts-node-dev src/index.ts',
        build: 'tsc',
        start: 'node dist/index.js',
      },
      dependencies: {
        express: '^4.18.2',
        cors: '^2.8.5',
        dotenv: '^16.3.1',
      },
      devDependencies: {
        '@types/express': '^4.17.21',
        '@types/cors': '^2.8.17',
        '@types/node': '^20.10.0',
        'ts-node-dev': '^2.0.0',
        typescript: '^5.3.3',
      },
    };

    await fs.writeFile(
      path.join(targetDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create basic Express app
    const indexTs = `import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`;

    await fs.mkdir(path.join(targetDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(targetDir, 'src', 'index.ts'), indexTs);
  }

  /**
   * Create FastAPI project
   */
  private async createFastAPIProject(targetDir: string, customization?: TemplateCustomization): Promise<void> {
    // Create requirements.txt
    const requirements = `fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
`;
    await fs.writeFile(path.join(targetDir, 'requirements.txt'), requirements);

    // Create main.py
    const mainPy = `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
`;
    await fs.writeFile(path.join(targetDir, 'main.py'), mainPy);
  }

  /**
   * Create NestJS project
   */
  private async createNestJSProject(targetDir: string, customization?: TemplateCustomization): Promise<void> {
    const projectName = customization?.projectName || 'my-app';
    await execAsync(`npx @nestjs/cli new ${projectName} --package-manager npm`, {
      cwd: path.dirname(targetDir),
    });
  }

  /**
   * Apply customizations to the project
   */
  private async applyCustomizations(
    targetDir: string,
    template: TemplateConfig,
    customization: TemplateCustomization
  ): Promise<void> {
    // Add Docker support if requested
    if (customization.addDocker) {
      await this.addDockerSupport(targetDir, template);
    }

    // Create .env file with provided variables
    if (customization.envVars) {
      await this.createEnvFile(targetDir, customization.envVars);
    }
  }

  /**
   * Add Docker support to project
   */
  private async addDockerSupport(targetDir: string, template: TemplateConfig): Promise<void> {
    // Basic Dockerfile (can be enhanced with actual IaC generators)
    const dockerfile = `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE ${template.defaultPort || 3000}
CMD ["npm", "start"]
`;
    await fs.writeFile(path.join(targetDir, 'Dockerfile'), dockerfile);

    // docker-compose.yml
    const dockerCompose = `version: '3.8'
services:
  app:
    build: .
    ports:
      - "${template.defaultPort || 3000}:${template.defaultPort || 3000}"
    environment:
      - NODE_ENV=production
`;
    await fs.writeFile(path.join(targetDir, 'docker-compose.yml'), dockerCompose);
  }

  /**
   * Create .env file
   */
  private async createEnvFile(targetDir: string, envVars: Record<string, string>): Promise<void> {
    const envContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    await fs.writeFile(path.join(targetDir, '.env'), envContent);
  }

  /**
   * Import project from GitHub repository
   */
  async importFromGitHub(repoUrl: string, targetDir: string): Promise<void> {
    this.logger.info(`Cloning repository from ${repoUrl}...`);
    
    await execAsync(`git clone ${repoUrl} ${targetDir}`);
    
    this.logger.success('Repository cloned successfully');
  }
}
