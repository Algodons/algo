/**
 * Encryption Utilities
 * Provides AES-256-GCM encryption for data at rest and in transit
 * Integrates with KMS for key management
 */

import crypto from 'crypto';
import { getKMS } from './kms';

export interface EncryptedData {
  encrypted: string; // Base64 encoded
  iv: string; // Base64 encoded
  authTag: string; // Base64 encoded
  keyId: string;
  algorithm: string;
  encryptedDEK?: string; // Base64 encoded encrypted data encryption key
}

export interface EncryptionConfig {
  algorithm?: string;
  encoding?: BufferEncoding;
}

const DEFAULT_ALGORITHM = 'aes-256-gcm';
const DEFAULT_ENCODING: BufferEncoding = 'base64';

/**
 * Encrypt data using AES-256-GCM
 */
export async function encrypt(
  data: string | Buffer,
  config: EncryptionConfig = {}
): Promise<EncryptedData> {
  const algorithm = config.algorithm || DEFAULT_ALGORITHM;
  
  // Get a data encryption key from KMS
  const kms = getKMS();
  const { plaintext: key, encrypted: encryptedDEK, keyId } = await kms.generateDataKey();

  // Generate IV (12 bytes for GCM)
  const iv = crypto.randomBytes(12);

  // Create cipher
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  // Encrypt data
  const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  const encrypted = Buffer.concat([
    cipher.update(dataBuffer),
    cipher.final(),
  ]);

  // Get authentication tag
  const authTag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString(DEFAULT_ENCODING),
    iv: iv.toString(DEFAULT_ENCODING),
    authTag: authTag.toString(DEFAULT_ENCODING),
    keyId,
    algorithm,
    encryptedDEK: encryptedDEK.toString(DEFAULT_ENCODING), // Store encrypted DEK with data
  };
}

/**
 * Decrypt data using AES-256-GCM
 * 
 * Note: This implementation requires the encrypted DEK to be stored alongside the data.
 * In a production system, you would:
 * 1. Store the encrypted DEK with the encrypted data
 * 2. Retrieve it during decryption
 * 3. Decrypt the DEK using KMS
 * 4. Use the decrypted DEK to decrypt the data
 */
export async function decrypt(
  encryptedData: EncryptedData & { encryptedDEK?: string },
  config: EncryptionConfig = {}
): Promise<Buffer> {
  const { encrypted, iv, authTag, keyId, algorithm, encryptedDEK } = encryptedData;

  // Get the data encryption key from KMS
  const kms = getKMS();
  
  // In production, decrypt the stored DEK
  // For now, this is a limitation - the DEK needs to be stored with the encrypted data
  // TODO: Implement proper DEK storage and retrieval
  let key: Buffer;
  if (encryptedDEK) {
    key = await kms.decryptDataKey(Buffer.from(encryptedDEK, DEFAULT_ENCODING), keyId);
  } else {
    throw new Error('Encrypted DEK not provided. Cannot decrypt data. In production, store encrypted DEK with data.');
  }

  // Create decipher
  const decipher = crypto.createDecipheriv(
    algorithm,
    key,
    Buffer.from(iv, DEFAULT_ENCODING)
  );

  // Set auth tag
  decipher.setAuthTag(Buffer.from(authTag, DEFAULT_ENCODING));

  // Decrypt data
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, DEFAULT_ENCODING)),
    decipher.final(),
  ]);

  return decrypted;
}

/**
 * Encrypt a JSON object
 */
export async function encryptJSON(
  data: any,
  config: EncryptionConfig = {}
): Promise<EncryptedData> {
  const jsonString = JSON.stringify(data);
  return encrypt(jsonString, config);
}

/**
 * Decrypt to JSON object
 */
export async function decryptJSON(
  encryptedData: EncryptedData,
  config: EncryptionConfig = {}
): Promise<any> {
  const decrypted = await decrypt(encryptedData, config);
  return JSON.parse(decrypted.toString('utf8'));
}

/**
 * Encrypt a file
 */
export async function encryptFile(
  filePath: string,
  outputPath: string,
  config: EncryptionConfig = {}
): Promise<EncryptedData> {
  const fs = await import('fs/promises');
  const fileData = await fs.readFile(filePath);
  const encrypted = await encrypt(fileData, config);
  
  // Write encrypted data to file
  await fs.writeFile(outputPath, JSON.stringify(encrypted, null, 2));
  
  return encrypted;
}

/**
 * Decrypt a file
 */
export async function decryptFile(
  encryptedFilePath: string,
  outputPath: string,
  config: EncryptionConfig = {}
): Promise<void> {
  const fs = await import('fs/promises');
  const encryptedDataString = await fs.readFile(encryptedFilePath, 'utf8');
  const encryptedData: EncryptedData = JSON.parse(encryptedDataString);
  
  const decrypted = await decrypt(encryptedData, config);
  await fs.writeFile(outputPath, decrypted);
}

/**
 * Hash data using SHA-256
 */
export function hash(data: string | Buffer): string {
  const hash = crypto.createHash('sha256');
  hash.update(typeof data === 'string' ? Buffer.from(data, 'utf8') : data);
  return hash.digest('hex');
}

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a cryptographically secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
  const randomBytes = crypto.randomBytes(length);
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  
  return password;
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Encrypt environment variables for secure storage
 */
export async function encryptEnvVars(envVars: Record<string, string>): Promise<EncryptedData> {
  return encryptJSON(envVars);
}

/**
 * Decrypt environment variables
 */
export async function decryptEnvVars(encryptedData: EncryptedData): Promise<Record<string, string>> {
  return decryptJSON(encryptedData);
}
