/**
 * Key Management System (KMS) Utilities
 * Provides key management for encryption operations
 * Supports integration with HashiCorp Vault, AWS KMS, or local key storage
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

interface KeyMetadata {
  id: string;
  algorithm: string;
  createdAt: Date;
  rotatedAt?: Date;
  status: 'active' | 'rotated' | 'deprecated';
}

interface KMSConfig {
  provider: 'local' | 'aws' | 'vault';
  keyStorePath?: string;
  awsRegion?: string;
  vaultUrl?: string;
  vaultToken?: string;
}

export class KeyManagementService {
  private config: KMSConfig;
  private masterKey: Buffer | null = null;
  private keys: Map<string, { key: Buffer; metadata: KeyMetadata }> = new Map();

  constructor(config: KMSConfig) {
    this.config = config;
  }

  /**
   * Initialize KMS - load or generate master key
   */
  async initialize(): Promise<void> {
    switch (this.config.provider) {
      case 'local':
        await this.initializeLocalKMS();
        break;
      case 'aws':
        await this.initializeAWSKMS();
        break;
      case 'vault':
        await this.initializeVaultKMS();
        break;
      default:
        throw new Error(`Unsupported KMS provider: ${this.config.provider}`);
    }
  }

  /**
   * Initialize local KMS with file-based key storage
   */
  private async initializeLocalKMS(): Promise<void> {
    const keyPath = this.config.keyStorePath || path.join(process.cwd(), '.keys');
    
    if (!fs.existsSync(keyPath)) {
      fs.mkdirSync(keyPath, { recursive: true, mode: 0o700 });
    }

    const masterKeyPath = path.join(keyPath, 'master.key');
    
    if (fs.existsSync(masterKeyPath)) {
      // Load existing master key
      this.masterKey = fs.readFileSync(masterKeyPath);
    } else {
      // Generate new master key (256-bit)
      this.masterKey = crypto.randomBytes(32);
      fs.writeFileSync(masterKeyPath, this.masterKey, { mode: 0o600 });
    }
  }

  /**
   * Initialize AWS KMS integration
   */
  private async initializeAWSKMS(): Promise<void> {
    // Placeholder for AWS KMS integration
    // In production, use AWS SDK to interact with KMS
    throw new Error('AWS KMS integration not yet implemented. Use local provider or implement AWS SDK integration.');
  }

  /**
   * Initialize HashiCorp Vault integration
   */
  private async initializeVaultKMS(): Promise<void> {
    // Placeholder for Vault integration
    // In production, use vault client to manage keys
    throw new Error('Vault KMS integration not yet implemented. Use local provider or implement Vault client integration.');
  }

  /**
   * Generate a new data encryption key (DEK)
   */
  async generateDataKey(): Promise<{ plaintext: Buffer; encrypted: Buffer; keyId: string }> {
    if (!this.masterKey) {
      throw new Error('KMS not initialized');
    }

    // Generate a new 256-bit data encryption key
    const plaintext = crypto.randomBytes(32);
    const keyId = crypto.randomUUID();

    // Encrypt the DEK with the master key
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(plaintext),
      cipher.final(),
    ]);
    
    const authTag = cipher.getAuthTag();

    // Store metadata
    const metadata: KeyMetadata = {
      id: keyId,
      algorithm: 'AES-256-GCM',
      createdAt: new Date(),
      status: 'active',
    };

    this.keys.set(keyId, {
      key: plaintext,
      metadata,
    });

    // Combine IV + encrypted data + auth tag
    const encryptedWithMetadata = Buffer.concat([iv, encrypted, authTag]);

    return {
      plaintext,
      encrypted: encryptedWithMetadata,
      keyId,
    };
  }

  /**
   * Decrypt a data encryption key
   */
  async decryptDataKey(encryptedKey: Buffer, keyId: string): Promise<Buffer> {
    if (!this.masterKey) {
      throw new Error('KMS not initialized');
    }

    // Extract IV, encrypted data, and auth tag
    const iv = encryptedKey.slice(0, 16);
    const authTag = encryptedKey.slice(-16);
    const encrypted = encryptedKey.slice(16, -16);

    // Decrypt with master key
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return plaintext;
  }

  /**
   * Rotate the master key
   */
  async rotateMasterKey(): Promise<void> {
    if (this.config.provider !== 'local') {
      throw new Error('Key rotation only supported for local provider');
    }

    const keyPath = this.config.keyStorePath || path.join(process.cwd(), '.keys');
    const oldMasterKeyPath = path.join(keyPath, 'master.key');
    const newMasterKeyPath = path.join(keyPath, `master.${Date.now()}.key`);

    // Backup old key
    if (fs.existsSync(oldMasterKeyPath)) {
      fs.copyFileSync(oldMasterKeyPath, newMasterKeyPath);
    }

    // Generate new master key
    const newMasterKey = crypto.randomBytes(32);
    fs.writeFileSync(oldMasterKeyPath, newMasterKey, { mode: 0o600 });

    this.masterKey = newMasterKey;
  }

  /**
   * Get key metadata
   */
  getKeyMetadata(keyId: string): KeyMetadata | undefined {
    return this.keys.get(keyId)?.metadata;
  }

  /**
   * List all keys
   */
  listKeys(): KeyMetadata[] {
    return Array.from(this.keys.values()).map(k => k.metadata);
  }

  /**
   * Mark a key as deprecated
   */
  deprecateKey(keyId: string): void {
    const key = this.keys.get(keyId);
    if (key) {
      key.metadata.status = 'deprecated';
    }
  }
}

/**
 * Singleton instance for application-wide use
 */
let kmsInstance: KeyManagementService | null = null;

export function getKMS(config?: KMSConfig): KeyManagementService {
  if (!kmsInstance && config) {
    kmsInstance = new KeyManagementService(config);
  }
  if (!kmsInstance) {
    throw new Error('KMS not initialized. Call getKMS with config first.');
  }
  return kmsInstance;
}

export async function initializeKMS(config: KMSConfig): Promise<KeyManagementService> {
  const kms = getKMS(config);
  await kms.initialize();
  return kms;
}
