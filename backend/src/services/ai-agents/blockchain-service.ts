/**
 * Blockchain & Web3 Integration Service
 * 
 * Manages cryptocurrency payments, NFT rewards, and immutable audit logs
 * on the blockchain.
 */

import { Pool } from 'pg';
import * as crypto from 'crypto';

export interface CryptoPayment {
  id: string;
  userId: number;
  amount: number;
  cryptocurrency: 'BTC' | 'ETH' | 'USDT' | 'USDC';
  walletAddress: string;
  status: 'pending' | 'confirmed' | 'failed';
  transactionHash?: string;
  confirmations: number;
  createdAt: Date;
}

export interface NFTReward {
  id: string;
  userId: number;
  achievementId: string;
  tokenId: string;
  contractAddress: string;
  metadata: {
    name: string;
    description: string;
    image: string;
    attributes: Array<{ trait_type: string; value: string }>;
  };
  mintedAt?: Date;
  blockchainTxHash?: string;
}

export interface BlockchainAuditLog {
  id: string;
  action: string;
  adminId: number;
  resourceType: string;
  resourceId: string;
  metadata: any;
  blockchainHash: string;
  blockNumber?: number;
  timestamp: Date;
}

export interface Web3Wallet {
  userId: number;
  address: string;
  type: 'metamask' | 'walletconnect' | 'coinbase';
  verified: boolean;
  connectedAt: Date;
}

export class BlockchainService {
  private pool: Pool;
  private readonly contractAddress = process.env.NFT_CONTRACT_ADDRESS || '0x0';
  private readonly networkId = process.env.BLOCKCHAIN_NETWORK_ID || '1'; // 1 = Ethereum mainnet

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Process cryptocurrency payment for subscription
   */
  async processCryptoPayment(
    userId: number,
    amount: number,
    cryptocurrency: 'BTC' | 'ETH' | 'USDT' | 'USDC',
    walletAddress: string
  ): Promise<CryptoPayment> {
    try {
      const paymentId = crypto.randomUUID();

      // Create payment record
      const result = await this.pool.query(
        `INSERT INTO crypto_payments (id, user_id, amount, cryptocurrency, wallet_address, status, confirmations, created_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', 0, NOW())
         RETURNING *`,
        [paymentId, userId, amount, cryptocurrency, walletAddress]
      );

      const payment = result.rows[0];

      // In production, initiate blockchain transaction
      // For now, simulate the process
      await this.initiateCryptoTransaction(payment);

      return {
        id: payment.id,
        userId: payment.user_id,
        amount: parseFloat(payment.amount),
        cryptocurrency: payment.cryptocurrency,
        walletAddress: payment.wallet_address,
        status: payment.status,
        transactionHash: payment.transaction_hash,
        confirmations: payment.confirmations,
        createdAt: payment.created_at,
      };
    } catch (error) {
      console.error('Crypto payment processing failed:', error);
      throw error;
    }
  }

  /**
   * Check payment status and confirmations
   */
  async checkPaymentStatus(paymentId: string): Promise<CryptoPayment> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM crypto_payments WHERE id = $1',
        [paymentId]
      );

      if (result.rows.length === 0) {
        throw new Error('Payment not found');
      }

      const payment = result.rows[0];

      // In production, query blockchain for confirmations
      if (payment.status === 'pending' && payment.transaction_hash) {
        const confirmations = await this.getTransactionConfirmations(payment.transaction_hash);
        
        await this.pool.query(
          'UPDATE crypto_payments SET confirmations = $1 WHERE id = $2',
          [confirmations, paymentId]
        );

        // Mark as confirmed after required confirmations (e.g., 6 for ETH)
        if (confirmations >= 6 && payment.status === 'pending') {
          await this.confirmPayment(paymentId);
        }
      }

      return {
        id: payment.id,
        userId: payment.user_id,
        amount: parseFloat(payment.amount),
        cryptocurrency: payment.cryptocurrency,
        walletAddress: payment.wallet_address,
        status: payment.status,
        transactionHash: payment.transaction_hash,
        confirmations: payment.confirmations,
        createdAt: payment.created_at,
      };
    } catch (error) {
      console.error('Failed to check payment status:', error);
      throw error;
    }
  }

  /**
   * Mint NFT reward for achievement
   */
  async mintNFTReward(
    userId: number,
    achievementId: string,
    achievementData: {
      name: string;
      description: string;
      image: string;
      rarity: string;
    }
  ): Promise<NFTReward> {
    try {
      const nftId = crypto.randomUUID();
      const tokenId = this.generateTokenId();

      // Create NFT metadata following ERC-721 standard
      const metadata = {
        name: achievementData.name,
        description: achievementData.description,
        image: achievementData.image,
        attributes: [
          { trait_type: 'Achievement', value: achievementData.name },
          { trait_type: 'Rarity', value: achievementData.rarity },
          { trait_type: 'Earned Date', value: new Date().toISOString() },
          { trait_type: 'Platform', value: 'Algo Cloud IDE' },
        ],
      };

      // Store NFT record
      const result = await this.pool.query(
        `INSERT INTO nft_rewards (id, user_id, achievement_id, token_id, contract_address, metadata, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
         RETURNING *`,
        [nftId, userId, achievementId, tokenId, this.contractAddress, JSON.stringify(metadata)]
      );

      const nft = result.rows[0];

      // In production, call smart contract to mint NFT
      const txHash = await this.mintNFTOnChain(userId, tokenId, metadata);

      // Update with transaction hash
      await this.pool.query(
        `UPDATE nft_rewards SET blockchain_tx_hash = $1, status = 'minted', minted_at = NOW() WHERE id = $2`,
        [txHash, nftId]
      );

      return {
        id: nft.id,
        userId: nft.user_id,
        achievementId: nft.achievement_id,
        tokenId: nft.token_id,
        contractAddress: nft.contract_address,
        metadata,
        mintedAt: new Date(),
        blockchainTxHash: txHash,
      };
    } catch (error) {
      console.error('NFT minting failed:', error);
      throw error;
    }
  }

  /**
   * Get user's NFT collection
   */
  async getUserNFTs(userId: number): Promise<NFTReward[]> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM nft_rewards WHERE user_id = $1 AND status = 'minted' ORDER BY minted_at DESC`,
        [userId]
      );

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        achievementId: row.achievement_id,
        tokenId: row.token_id,
        contractAddress: row.contract_address,
        metadata: row.metadata,
        mintedAt: row.minted_at,
        blockchainTxHash: row.blockchain_tx_hash,
      }));
    } catch (error) {
      console.error('Failed to get user NFTs:', error);
      throw error;
    }
  }

  /**
   * Create immutable blockchain audit log
   */
  async createBlockchainAuditLog(
    action: string,
    adminId: number,
    resourceType: string,
    resourceId: string,
    metadata: any
  ): Promise<BlockchainAuditLog> {
    try {
      const logId = crypto.randomUUID();
      const timestamp = new Date();

      // Create hash of audit data
      const dataToHash = JSON.stringify({
        action,
        adminId,
        resourceType,
        resourceId,
        metadata,
        timestamp: timestamp.toISOString(),
      });

      const blockchainHash = this.createHash(dataToHash);

      // Store in database
      await this.pool.query(
        `INSERT INTO blockchain_audit_logs (id, action, admin_id, resource_type, resource_id, metadata, blockchain_hash, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [logId, action, adminId, resourceType, resourceId, JSON.stringify(metadata), blockchainHash, timestamp]
      );

      // In production, write hash to blockchain for immutability
      const blockNumber = await this.writeAuditToBlockchain(blockchainHash);

      await this.pool.query(
        'UPDATE blockchain_audit_logs SET block_number = $1 WHERE id = $2',
        [blockNumber, logId]
      );

      return {
        id: logId,
        action,
        adminId,
        resourceType,
        resourceId,
        metadata,
        blockchainHash,
        blockNumber,
        timestamp,
      };
    } catch (error) {
      console.error('Failed to create blockchain audit log:', error);
      throw error;
    }
  }

  /**
   * Verify audit log integrity
   */
  async verifyAuditLog(logId: string): Promise<{ valid: boolean; message: string }> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM blockchain_audit_logs WHERE id = $1',
        [logId]
      );

      if (result.rows.length === 0) {
        return { valid: false, message: 'Audit log not found' };
      }

      const log = result.rows[0];

      // Recreate hash
      const dataToHash = JSON.stringify({
        action: log.action,
        adminId: log.admin_id,
        resourceType: log.resource_type,
        resourceId: log.resource_id,
        metadata: log.metadata,
        timestamp: log.timestamp.toISOString(),
      });

      const computedHash = this.createHash(dataToHash);

      // Compare hashes
      if (computedHash !== log.blockchain_hash) {
        return { valid: false, message: 'Hash mismatch - log may have been tampered with' };
      }

      // In production, verify hash exists on blockchain
      const onChain = await this.verifyHashOnBlockchain(log.blockchain_hash, log.block_number);
      
      if (!onChain) {
        return { valid: false, message: 'Hash not found on blockchain' };
      }

      return { valid: true, message: 'Audit log verified and immutable' };
    } catch (error) {
      console.error('Failed to verify audit log:', error);
      throw error;
    }
  }

  /**
   * Connect Web3 wallet
   */
  async connectWallet(
    userId: number,
    address: string,
    type: 'metamask' | 'walletconnect' | 'coinbase',
    signature: string
  ): Promise<Web3Wallet> {
    try {
      // Verify wallet ownership through signature
      const isValid = await this.verifyWalletSignature(address, signature, userId);

      if (!isValid) {
        throw new Error('Invalid wallet signature');
      }

      // Store wallet connection
      await this.pool.query(
        `INSERT INTO web3_wallets (user_id, address, type, verified, connected_at)
         VALUES ($1, $2, $3, true, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           address = $2, type = $3, verified = true, connected_at = NOW()`,
        [userId, address, type]
      );

      return {
        userId,
        address,
        type,
        verified: true,
        connectedAt: new Date(),
      };
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  /**
   * Get supported cryptocurrencies with current rates
   */
  async getSupportedCryptocurrencies(): Promise<Array<{
    symbol: string;
    name: string;
    network: string;
    usdRate: number;
    minAmount: number;
    confirmationsRequired: number;
  }>> {
    return [
      {
        symbol: 'ETH',
        name: 'Ethereum',
        network: 'Ethereum Mainnet',
        usdRate: 2000, // In production, fetch from oracle
        minAmount: 0.001,
        confirmationsRequired: 6,
      },
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        network: 'Bitcoin Mainnet',
        usdRate: 35000,
        minAmount: 0.0001,
        confirmationsRequired: 3,
      },
      {
        symbol: 'USDT',
        name: 'Tether USD',
        network: 'Ethereum (ERC-20)',
        usdRate: 1,
        minAmount: 10,
        confirmationsRequired: 6,
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        network: 'Ethereum (ERC-20)',
        usdRate: 1,
        minAmount: 10,
        confirmationsRequired: 6,
      },
    ];
  }

  // Private helper methods

  private async initiateCryptoTransaction(payment: any): Promise<void> {
    // In production, integrate with blockchain SDK (ethers.js, web3.js, etc.)
    // For now, simulate with a mock transaction hash
    const mockTxHash = '0x' + crypto.randomBytes(32).toString('hex');
    
    await this.pool.query(
      'UPDATE crypto_payments SET transaction_hash = $1 WHERE id = $2',
      [mockTxHash, payment.id]
    );
  }

  private async getTransactionConfirmations(txHash: string): Promise<number> {
    // In production, query blockchain for actual confirmations
    // Mock: return increasing confirmations over time
    return Math.floor(Math.random() * 10);
  }

  private async confirmPayment(paymentId: string): Promise<void> {
    await this.pool.query(
      'UPDATE crypto_payments SET status = $1 WHERE id = $2',
      ['confirmed', paymentId]
    );

    // Get payment details
    const result = await this.pool.query(
      'SELECT user_id, amount FROM crypto_payments WHERE id = $1',
      [paymentId]
    );

    const payment = result.rows[0];

    // Apply subscription based on payment
    // (Would integrate with subscription service)
    await this.pool.query(
      `INSERT INTO credit_transactions (user_id, amount, type, description, created_at)
       VALUES ($1, $2, 'purchase', 'Crypto payment confirmed', NOW())`,
      [payment.user_id, payment.amount]
    );
  }

  private generateTokenId(): string {
    // Generate unique token ID
    return Date.now().toString() + Math.floor(Math.random() * 10000);
  }

  private async mintNFTOnChain(userId: number, tokenId: string, metadata: any): Promise<string> {
    // In production, call smart contract mint function
    // For now, return mock transaction hash
    return '0x' + crypto.randomBytes(32).toString('hex');
  }

  private createHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private async writeAuditToBlockchain(hash: string): Promise<number> {
    // In production, write to blockchain smart contract
    // For now, return mock block number
    return Math.floor(Math.random() * 1000000) + 10000000;
  }

  private async verifyHashOnBlockchain(hash: string, blockNumber?: number): Promise<boolean> {
    // In production, verify hash exists in blockchain at given block
    // For now, return true for simulation
    return true;
  }

  private async verifyWalletSignature(address: string, signature: string, userId: number): Promise<boolean> {
    // In production, verify ECDSA signature
    // Message should be: "Connect wallet to Algo Cloud IDE - User ID: {userId}"
    // For now, return true for simulation
    return signature.length > 10;
  }
}

export default BlockchainService;
