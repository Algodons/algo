import { FrameworkInfo } from '../auto-detect/framework-detector';
import { BuildCommands } from '../auto-detect/build-command-inferrer';
import { PortConfiguration } from '../auto-detect/port-detector';

/**
 * Generate optimized Dockerfiles based on project configuration
 */
export class DockerfileGenerator {
  /**
   * Generate Dockerfile for the project
   */
  generateDockerfile(
    frameworks: FrameworkInfo[],
    commands: BuildCommands,
    ports: PortConfiguration[]
  ): string {
    if (frameworks.length === 0) {
      return this.generateGenericDockerfile();
    }

    const primaryFramework = frameworks[0];

    switch (primaryFramework.language) {
      case 'JavaScript/TypeScript':
      case 'TypeScript':
        return this.generateNodeDockerfile(primaryFramework, commands, ports);
      case 'Python':
        return this.generatePythonDockerfile(primaryFramework, commands, ports);
      case 'Rust':
        return this.generateRustDockerfile(primaryFramework, commands, ports);
      case 'Java':
        return this.generateJavaDockerfile(primaryFramework, commands, ports);
      case 'Go':
        return this.generateGoDockerfile(primaryFramework, commands, ports);
      case 'PHP':
        return this.generatePhpDockerfile(primaryFramework, commands, ports);
      default:
        return this.generateGenericDockerfile();
    }
  }

  /**
   * Generate Dockerfile for Node.js projects
   */
  private generateNodeDockerfile(
    framework: FrameworkInfo,
    commands: BuildCommands,
    ports: PortConfiguration[]
  ): string {
    const port = ports[0]?.port || 3000;
    const packageManager = framework.packageManager || 'npm';
    
    const lockFile = packageManager === 'yarn' ? 'yarn.lock' 
      : packageManager === 'pnpm' ? 'pnpm-lock.yaml' 
      : 'package-lock.json';

    return `# Multi-stage build for ${framework.name}
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ${lockFile !== 'package-lock.json' ? lockFile : ''} ./

# Install dependencies
RUN ${packageManager === 'npm' ? 'npm ci' : packageManager === 'yarn' ? 'yarn install --frozen-lockfile' : 'pnpm install --frozen-lockfile'}

# Copy source code
COPY . .

# Build application
${commands.build.length > 0 ? `RUN ${commands.build[0]}` : '# No build step required'}

# Stage 2: Production
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN ${packageManager === 'npm' ? 'npm ci --only=production' : packageManager === 'yarn' ? 'yarn install --production --frozen-lockfile' : 'pnpm install --prod --frozen-lockfile'}

# Copy built application from builder
${commands.build.length > 0 ? 'COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist' : 'COPY --chown=nodejs:nodejs . .'}
${framework.name === 'Next.js' ? 'COPY --from=builder --chown=nodejs:nodejs /app/.next ./.next' : ''}
${framework.name === 'Next.js' ? 'COPY --from=builder --chown=nodejs:nodejs /app/public ./public' : ''}

# Set user
USER nodejs

# Expose port
EXPOSE ${port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:${port}/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start application
CMD ${commands.start.length > 0 ? JSON.stringify(commands.start[0].split(' ')) : '["npm", "start"]'}
`;
  }

  /**
   * Generate Dockerfile for Python projects
   */
  private generatePythonDockerfile(
    framework: FrameworkInfo,
    _commands: BuildCommands,
    ports: PortConfiguration[]
  ): string {
    const port = ports[0]?.port || 8000;
    const isDjango = framework.name === 'Django';
    const isFastAPI = framework.name === 'FastAPI';

    return `# Dockerfile for ${framework.name}
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1 \\
    PIP_NO_CACHE_DIR=1 \\
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \\
    gcc \\
    postgresql-client \\
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1001 appuser

# Copy requirements
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt ${isFastAPI ? '&& pip install uvicorn[standard]' : ''}

# Copy application code
COPY --chown=appuser:appuser . .

${isDjango ? '# Collect static files\nRUN python manage.py collectstatic --noinput' : ''}

# Set user
USER appuser

# Expose port
EXPOSE ${port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${port}/health').getcode()" || exit 1

# Start application
CMD ${commands.start.length > 0 ? JSON.stringify(commands.start[0].split(' ')) : '["python", "manage.py", "runserver", "0.0.0.0:' + port + '"]'}
`;
  }

  /**
   * Generate Dockerfile for Rust projects
   */
  private generateRustDockerfile(
    framework: FrameworkInfo,
    _commands: BuildCommands,
    ports: PortConfiguration[]
  ): string {
    const port = ports[0]?.port || 8080;

    return `# Multi-stage build for ${framework.name}
# Stage 1: Build
FROM rust:1.75 AS builder

WORKDIR /app

# Copy manifests
COPY Cargo.toml Cargo.lock ./

# Create dummy main to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

# Copy source code
COPY . .

# Build application
RUN cargo build --release

# Stage 2: Runtime
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \\
    ca-certificates \\
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1001 appuser

WORKDIR /app

# Copy binary from builder
COPY --from=builder --chown=appuser:appuser /app/target/release/main ./main

# Set user
USER appuser

# Expose port
EXPOSE ${port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:${port}/health || exit 1

# Start application
CMD ["./main"]
`;
  }

  /**
   * Generate Dockerfile for Java projects
   */
  private generateJavaDockerfile(
    framework: FrameworkInfo,
    _commands: BuildCommands,
    ports: PortConfiguration[]
  ): string {
    const port = ports[0]?.port || 8080;

    return `# Multi-stage build for ${framework.name}
# Stage 1: Build
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

# Copy pom.xml
COPY pom.xml ./

# Download dependencies
RUN mvn dependency:go-offline

# Copy source code
COPY src ./src

# Build application
RUN mvn package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:17-jre-alpine

# Create non-root user
RUN addgroup -g 1001 -S spring && adduser -S spring -u 1001

WORKDIR /app

# Copy JAR from builder
COPY --from=builder --chown=spring:spring /app/target/*.jar app.jar

# Set user
USER spring

# Expose port
EXPOSE ${port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:${port}/actuator/health || exit 1

# Start application
CMD ["java", "-jar", "app.jar"]
`;
  }

  /**
   * Generate Dockerfile for Go projects
   */
  private generateGoDockerfile(
    framework: FrameworkInfo,
    _commands: BuildCommands,
    ports: PortConfiguration[]
  ): string {
    const port = ports[0]?.port || 8080;

    return `# Multi-stage build for ${framework.name}
# Stage 1: Build
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Stage 2: Runtime
FROM alpine:latest

# Install ca-certificates
RUN apk --no-cache add ca-certificates

# Create non-root user
RUN addgroup -g 1001 -S appuser && adduser -S appuser -u 1001

WORKDIR /app

# Copy binary from builder
COPY --from=builder --chown=appuser:appuser /app/main ./main

# Set user
USER appuser

# Expose port
EXPOSE ${port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:${port}/health || exit 1

# Start application
CMD ["./main"]
`;
  }

  /**
   * Generate Dockerfile for PHP projects
   */
  private generatePhpDockerfile(
    framework: FrameworkInfo,
    commands: BuildCommands,
    ports: PortConfiguration[]
  ): string {
    const port = ports[0]?.port || 8000;

    return `# Dockerfile for ${framework.name}
FROM php:8.2-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \\
    nginx \\
    supervisor \\
    postgresql-dev \\
    && docker-php-ext-install pdo pdo_pgsql

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Create non-root user
RUN addgroup -g 1001 -S www && adduser -S www -u 1001

WORKDIR /var/www/html

# Copy application files
COPY --chown=www:www . .

# Install dependencies
RUN composer install --no-dev --optimize-autoloader

# Set user
USER www

# Expose port
EXPOSE ${port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:${port}/health || exit 1

# Start application
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=${port}"]
`;
  }

  /**
   * Generate generic Dockerfile
   */
  private generateGenericDockerfile(): string {
    return `# Generic Dockerfile
FROM ubuntu:22.04

# Install common dependencies
RUN apt-get update && apt-get install -y \\
    curl \\
    wget \\
    git \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy application files
COPY . .

# Expose default port
EXPOSE 8080

# Start application
CMD ["bash"]
`;
  }
}
