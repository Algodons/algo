const AWS = require('aws-sdk');
const { logger } = require('../utils/logger');

// Configure AWS SDK for S3-compatible storage (MinIO)
const s3 = new AWS.S3({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
  secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
  region: process.env.S3_REGION || 'us-east-1',
});

const BUCKET_NAME = process.env.S3_BUCKET || 'algo-projects';

// Initialize bucket
const initializeBucket = async () => {
  try {
    await s3.headBucket({ Bucket: BUCKET_NAME }).promise();
    logger.info(`S3 bucket '${BUCKET_NAME}' exists`);
  } catch (error) {
    if (error.statusCode === 404) {
      await s3.createBucket({ Bucket: BUCKET_NAME }).promise();
      logger.info(`S3 bucket '${BUCKET_NAME}' created`);
    } else {
      throw error;
    }
  }
};

initializeBucket().catch((err) => logger.error('S3 initialization error:', err));

const createProjectBucket = async (s3Path) => {
  try {
    // S3 doesn't require explicit folder creation, but we can create a placeholder
    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: `${s3Path}/.keep`,
      Body: '',
    }).promise();

    logger.info(`Project bucket created at ${s3Path}`);
  } catch (error) {
    logger.error('Create project bucket error:', error);
    throw error;
  }
};

const readFile = async (projectId, filePath) => {
  try {
    const key = `projects/${projectId}${filePath}`;

    const result = await s3.getObject({
      Bucket: BUCKET_NAME,
      Key: key,
    }).promise();

    return result.Body.toString('utf-8');
  } catch (error) {
    if (error.statusCode === 404) {
      throw new Error('File not found');
    }
    logger.error('Read file error:', error);
    throw error;
  }
};

const writeFile = async (projectId, filePath, content) => {
  try {
    const key = `projects/${projectId}${filePath}`;

    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: content,
      ContentType: 'text/plain',
    }).promise();

    logger.info(`File saved: ${key}`);
  } catch (error) {
    logger.error('Write file error:', error);
    throw error;
  }
};

const listFiles = async (projectId, path = '/') => {
  try {
    const prefix = `projects/${projectId}${path}`;

    const result = await s3.listObjectsV2({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      Delimiter: '/',
    }).promise();

    const files = [];

    // Add folders
    if (result.CommonPrefixes) {
      result.CommonPrefixes.forEach((prefix) => {
        files.push({
          name: prefix.Prefix.split('/').slice(-2)[0],
          type: 'folder',
          path: prefix.Prefix.replace(`projects/${projectId}`, ''),
        });
      });
    }

    // Add files
    if (result.Contents) {
      result.Contents.forEach((obj) => {
        const fileName = obj.Key.split('/').pop();
        if (fileName && fileName !== '.keep') {
          files.push({
            name: fileName,
            type: 'file',
            path: obj.Key.replace(`projects/${projectId}`, ''),
            size: obj.Size,
            lastModified: obj.LastModified,
          });
        }
      });
    }

    return files;
  } catch (error) {
    logger.error('List files error:', error);
    throw error;
  }
};

const deleteFile = async (projectId, filePath) => {
  try {
    const key = `projects/${projectId}${filePath}`;

    await s3.deleteObject({
      Bucket: BUCKET_NAME,
      Key: key,
    }).promise();

    logger.info(`File deleted: ${key}`);
  } catch (error) {
    logger.error('Delete file error:', error);
    throw error;
  }
};

module.exports = {
  createProjectBucket,
  readFile,
  writeFile,
  listFiles,
  deleteFile,
};
