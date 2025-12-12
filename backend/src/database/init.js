const { Pool } = require('pg');
const { createClient } = require('redis');
const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

// PostgreSQL connection
const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'algo_ide',
  user: process.env.POSTGRES_USER || 'algo_user',
  password: process.env.POSTGRES_PASSWORD || 'algo_password',
});

// Redis connection
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
  password: process.env.REDIS_PASSWORD,
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Redis connected'));

// MongoDB connection
const connectMongoDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/algo_logs'
    );
    logger.info('MongoDB connected');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    throw error;
  }
};

const initializeDatabase = async () => {
  try {
    // Test PostgreSQL connection
    const client = await pgPool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('PostgreSQL connected');

    // Connect Redis
    await redisClient.connect();

    // Connect MongoDB
    await connectMongoDB();

    // Initialize tables
    await initializeTables();
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
};

const initializeTables = async () => {
  const createTablesQuery = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Projects table
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      language VARCHAR(50),
      s3_path VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Environment variables table
    CREATE TABLE IF NOT EXISTS env_variables (
      id SERIAL PRIMARY KEY,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      key VARCHAR(255) NOT NULL,
      value TEXT NOT NULL,
      encrypted BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Domains table
    CREATE TABLE IF NOT EXISTS custom_domains (
      id SERIAL PRIMARY KEY,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      domain VARCHAR(255) UNIQUE NOT NULL,
      ssl_certificate TEXT,
      ssl_key TEXT,
      verified BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Audit logs table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      resource_type VARCHAR(50),
      resource_id INTEGER,
      details JSONB,
      ip_address VARCHAR(45),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_env_variables_project_id ON env_variables(project_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
  `;

  await pgPool.query(createTablesQuery);
  logger.info('Database tables initialized');
};

module.exports = {
  pgPool,
  redisClient,
  mongoose,
  initializeDatabase,
};
