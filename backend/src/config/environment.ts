/**
 * Environment Configuration
 * Centralized configuration for all environment variables
 */

export interface EnvironmentConfig {
  // Server
  nodeEnv: string;
  port: number;
  frontendUrl: string;

  // Database
  db: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };

  // Authentication
  jwt: {
    secret: string;
    expiration: string;
  };
  
  encryptionSecret: string;

  // Redis
  redis: {
    host: string;
    port: number;
    password?: string;
  };

  // Copilot SaaS
  copilot: {
    apiUrl: string;
    apiKey: string;
    enabled: boolean;
  };

  // AI/ML Services
  ai: {
    serviceEnabled: boolean;
    modelsEnabled: boolean;
  };

  // Feature Flags
  features: {
    collaboration: boolean;
    gitIntegration: boolean;
    monitoring: boolean;
  };

  // Logging
  logging: {
    level: string;
    format: string;
    debug: boolean;
    verbose: boolean;
  };

  // CORS
  cors: {
    origin: string;
    credentials: boolean;
  };

  // Rate Limiting
  rateLimit: {
    window: string;
    maxRequests: number;
  };

  // Development
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
}

/**
 * Load and validate environment configuration
 */
export function loadEnvironmentConfig(): EnvironmentConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isDevelopment = nodeEnv === 'development';
  const isProduction = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';

  return {
    // Server
    nodeEnv,
    port: parseInt(process.env.PORT || '4000', 10),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

    // Database
    db: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      name: process.env.DB_NAME || 'algo_ide',
      user: process.env.DB_USER || 'algo_user',
      password: process.env.DB_PASSWORD || '',
    },

    // Authentication
    jwt: {
      secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
      expiration: process.env.JWT_EXPIRATION || '7d',
    },
    
    encryptionSecret: process.env.ENCRYPTION_SECRET || 'dev-encryption-key-change-in-production',

    // Redis
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    },

    // Copilot SaaS
    copilot: {
      apiUrl: process.env.COPILOT_API_URL || 'https://api.copilot.example.com',
      apiKey: process.env.COPILOT_API_KEY || '',
      enabled: process.env.COPILOT_ENABLED === 'true',
    },

    // AI/ML Services
    ai: {
      serviceEnabled: process.env.AI_SERVICE_ENABLED === 'true',
      modelsEnabled: process.env.ML_MODELS_ENABLED === 'true',
    },

    // Feature Flags
    features: {
      collaboration: process.env.ENABLE_COLLABORATION !== 'false',
      gitIntegration: process.env.ENABLE_GIT_INTEGRATION !== 'false',
      monitoring: process.env.ENABLE_MONITORING !== 'false',
    },

    // Logging
    logging: {
      level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
      format: process.env.LOG_FORMAT || (isDevelopment ? 'dev' : 'combined'),
      debug: process.env.DEBUG === 'true' || isDevelopment,
      verbose: process.env.VERBOSE_LOGGING === 'true' || isDevelopment,
    },

    // CORS
    cors: {
      origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: process.env.CORS_CREDENTIALS !== 'false',
    },

    // Rate Limiting
    rateLimit: {
      window: process.env.RATE_LIMIT_WINDOW || '15m',
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },

    // Environment flags
    isDevelopment,
    isProduction,
    isTest,
  };
}

/**
 * Validate required environment variables
 */
export function validateEnvironmentConfig(config: EnvironmentConfig): void {
  const errors: string[] = [];

  // Validate JWT secret in production
  if (config.isProduction) {
    if (!config.jwt.secret || config.jwt.secret.includes('dev-') || config.jwt.secret.includes('change-in-production')) {
      errors.push('JWT_SECRET must be set to a secure value in production');
    }

    if (!config.encryptionSecret || config.encryptionSecret.includes('dev-') || config.encryptionSecret.includes('change-in-production')) {
      errors.push('ENCRYPTION_SECRET must be set to a secure value in production');
    }

    if (!config.db.password) {
      errors.push('DB_PASSWORD must be set in production');
    }

    if (config.copilot.enabled && !config.copilot.apiKey) {
      errors.push('COPILOT_API_KEY must be set when Copilot is enabled');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Get environment configuration singleton
 */
let envConfig: EnvironmentConfig | null = null;

export function getEnvironmentConfig(): EnvironmentConfig {
  if (!envConfig) {
    envConfig = loadEnvironmentConfig();
    validateEnvironmentConfig(envConfig);
    
    // Log configuration in development
    if (envConfig.isDevelopment && envConfig.logging.verbose) {
      console.log('🔧 Environment Configuration:');
      console.log(`   Environment: ${envConfig.nodeEnv}`);
      console.log(`   Port: ${envConfig.port}`);
      console.log(`   Frontend URL: ${envConfig.frontendUrl}`);
      console.log(`   Database: ${envConfig.db.host}:${envConfig.db.port}/${envConfig.db.name}`);
      console.log(`   Copilot Enabled: ${envConfig.copilot.enabled}`);
      if (envConfig.copilot.enabled) {
        console.log(`   Copilot API: ${envConfig.copilot.apiUrl}`);
      }
      console.log(`   AI Service Enabled: ${envConfig.ai.serviceEnabled}`);
      console.log(`   Debug Mode: ${envConfig.logging.debug}`);
    }
  }
  
  return envConfig;
}

export default getEnvironmentConfig;
