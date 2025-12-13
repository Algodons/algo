import { Pool } from 'pg';

export interface CreditBalance {
  userId: number;
  balance: number;
  currency: string;
  autoReloadEnabled: boolean;
  autoReloadThreshold?: number;
  autoReloadAmount?: number;
}

export interface CreditTransaction {
  id: number;
  userId: number;
  amount: number;
  type: string;
  description: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: Date;
}

export class CreditsService {
  constructor(private pool: Pool) {}

  /**
   * Get user's credit balance
   */
  async getBalance(userId: number): Promise<CreditBalance> {
    const result = await this.pool.query(
      `SELECT 
        user_id as "userId", balance, currency,
        auto_reload_enabled as "autoReloadEnabled",
        auto_reload_threshold as "autoReloadThreshold",
        auto_reload_amount as "autoReloadAmount"
      FROM prepaid_credits
      WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Create initial balance record
      return await this.createBalance(userId);
    }

    return result.rows[0];
  }

  /**
   * Create initial balance record
   */
  private async createBalance(userId: number): Promise<CreditBalance> {
    const result = await this.pool.query(
      `INSERT INTO prepaid_credits (user_id, balance, currency)
       VALUES ($1, 0, 'USD')
       ON CONFLICT (user_id) DO NOTHING
       RETURNING 
         user_id as "userId", balance, currency,
         auto_reload_enabled as "autoReloadEnabled",
         auto_reload_threshold as "autoReloadThreshold",
         auto_reload_amount as "autoReloadAmount"`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Already exists, fetch it
      return await this.getBalance(userId);
    }

    return result.rows[0];
  }

  /**
   * Purchase credits
   */
  async purchaseCredits(
    userId: number,
    amount: number,
    paymentMethodId?: number,
    invoiceId?: number
  ): Promise<CreditBalance> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get current balance
      const currentBalance = await this.getBalance(userId);

      // Add credits
      const newBalance = currentBalance.balance + amount;

      const result = await client.query(
        `UPDATE prepaid_credits
         SET balance = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2
         RETURNING 
           user_id as "userId", balance, currency,
           auto_reload_enabled as "autoReloadEnabled",
           auto_reload_threshold as "autoReloadThreshold",
           auto_reload_amount as "autoReloadAmount"`,
        [newBalance, userId]
      );

      // Record transaction
      await client.query(
        `INSERT INTO prepaid_credit_transactions
          (user_id, amount, type, description, balance_before, balance_after, invoice_id)
        VALUES ($1, $2, 'purchase', $3, $4, $5, $6)`,
        [
          userId,
          amount,
          `Purchased ${amount} credits`,
          currentBalance.balance,
          newBalance,
          invoiceId,
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Deduct credits for usage
   */
  async deductCredits(
    userId: number,
    amount: number,
    description: string,
    usageMetricId?: number
  ): Promise<CreditBalance> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get current balance
      const currentBalance = await this.getBalance(userId);

      if (currentBalance.balance < amount) {
        // Check if auto-reload is enabled
        if (
          currentBalance.autoReloadEnabled &&
          currentBalance.autoReloadThreshold !== undefined &&
          currentBalance.autoReloadAmount !== undefined
        ) {
          // Trigger auto-reload
          await this.triggerAutoReload(client, userId, currentBalance);
        } else {
          throw new Error('Insufficient credits');
        }
      }

      // Deduct credits
      const newBalance = currentBalance.balance - amount;

      const result = await client.query(
        `UPDATE prepaid_credits
         SET balance = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2
         RETURNING 
           user_id as "userId", balance, currency,
           auto_reload_enabled as "autoReloadEnabled",
           auto_reload_threshold as "autoReloadThreshold",
           auto_reload_amount as "autoReloadAmount"`,
        [newBalance, userId]
      );

      // Record transaction
      await client.query(
        `INSERT INTO prepaid_credit_transactions
          (user_id, amount, type, description, balance_before, balance_after, usage_metric_id)
        VALUES ($1, $2, 'usage', $3, $4, $5, $6)`,
        [userId, -amount, description, currentBalance.balance, newBalance, usageMetricId]
      );

      // Check if balance is below threshold and auto-reload is enabled
      if (
        currentBalance.autoReloadEnabled &&
        currentBalance.autoReloadThreshold !== undefined &&
        newBalance <= currentBalance.autoReloadThreshold
      ) {
        // Trigger auto-reload
        await this.triggerAutoReload(client, userId, result.rows[0]);
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(userId: number, limit: number = 50): Promise<CreditTransaction[]> {
    const result = await this.pool.query(
      `SELECT 
        id, user_id as "userId", amount, type, description,
        balance_before as "balanceBefore", balance_after as "balanceAfter",
        created_at as "createdAt"
      FROM prepaid_credit_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  /**
   * Configure auto-reload
   */
  async configureAutoReload(
    userId: number,
    enabled: boolean,
    threshold?: number,
    amount?: number
  ): Promise<CreditBalance> {
    if (enabled && (!threshold || !amount)) {
      throw new Error('Threshold and amount are required when enabling auto-reload');
    }

    const result = await this.pool.query(
      `UPDATE prepaid_credits
       SET auto_reload_enabled = $1,
           auto_reload_threshold = $2,
           auto_reload_amount = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $4
       RETURNING 
         user_id as "userId", balance, currency,
         auto_reload_enabled as "autoReloadEnabled",
         auto_reload_threshold as "autoReloadThreshold",
         auto_reload_amount as "autoReloadAmount"`,
      [enabled, threshold, amount, userId]
    );

    if (result.rows.length === 0) {
      // Create balance record if it doesn't exist
      await this.createBalance(userId);
      return await this.configureAutoReload(userId, enabled, threshold, amount);
    }

    return result.rows[0];
  }

  /**
   * Grant bonus credits (for promotions, referrals, etc.)
   */
  async grantBonusCredits(
    userId: number,
    amount: number,
    reason: string,
    expiresAt?: Date
  ): Promise<CreditBalance> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get current balance
      const currentBalance = await this.getBalance(userId);

      // Add credits
      const newBalance = currentBalance.balance + amount;

      const result = await client.query(
        `UPDATE prepaid_credits
         SET balance = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2
         RETURNING 
           user_id as "userId", balance, currency,
           auto_reload_enabled as "autoReloadEnabled",
           auto_reload_threshold as "autoReloadThreshold",
           auto_reload_amount as "autoReloadAmount"`,
        [newBalance, userId]
      );

      // Record transaction
      await client.query(
        `INSERT INTO prepaid_credit_transactions
          (user_id, amount, type, description, balance_before, balance_after, expires_at)
        VALUES ($1, $2, 'bonus', $3, $4, $5, $6)`,
        [userId, amount, reason, currentBalance.balance, newBalance, expiresAt]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Refund credits
   */
  async refundCredits(
    userId: number,
    amount: number,
    reason: string,
    invoiceId?: number
  ): Promise<CreditBalance> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get current balance
      const currentBalance = await this.getBalance(userId);

      // Add refunded amount
      const newBalance = currentBalance.balance + amount;

      const result = await client.query(
        `UPDATE prepaid_credits
         SET balance = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2
         RETURNING 
           user_id as "userId", balance, currency,
           auto_reload_enabled as "autoReloadEnabled",
           auto_reload_threshold as "autoReloadThreshold",
           auto_reload_amount as "autoReloadAmount"`,
        [newBalance, userId]
      );

      // Record transaction
      await client.query(
        `INSERT INTO prepaid_credit_transactions
          (user_id, amount, type, description, balance_before, balance_after, invoice_id)
        VALUES ($1, $2, 'refund', $3, $4, $5, $6)`,
        [userId, amount, reason, currentBalance.balance, newBalance, invoiceId]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Trigger auto-reload
   */
  private async triggerAutoReload(
    client: any,
    userId: number,
    currentBalance: CreditBalance
  ): Promise<void> {
    if (!currentBalance.autoReloadAmount) {
      return;
    }

    const amount = currentBalance.autoReloadAmount;
    const newBalance = currentBalance.balance + amount;

    // Update balance
    await client.query(
      `UPDATE prepaid_credits
       SET balance = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [newBalance, userId]
    );

    // Record auto-reload transaction
    await client.query(
      `INSERT INTO prepaid_credit_transactions
        (user_id, amount, type, description, balance_before, balance_after)
      VALUES ($1, $2, 'auto_reload', $3, $4, $5)`,
      [
        userId,
        amount,
        `Auto-reload: ${amount} credits`,
        currentBalance.balance,
        newBalance,
      ]
    );

    // TODO: Create invoice and process payment for auto-reload
    console.log(`Auto-reload triggered for user ${userId}: ${amount} credits`);
  }

  /**
   * Adjust credits (admin function)
   */
  async adjustCredits(
    userId: number,
    amount: number,
    reason: string,
    adminId: number
  ): Promise<CreditBalance> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get current balance
      const currentBalance = await this.getBalance(userId);

      // Adjust balance
      const newBalance = currentBalance.balance + amount;

      if (newBalance < 0) {
        throw new Error('Adjustment would result in negative balance');
      }

      const result = await client.query(
        `UPDATE prepaid_credits
         SET balance = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2
         RETURNING 
           user_id as "userId", balance, currency,
           auto_reload_enabled as "autoReloadEnabled",
           auto_reload_threshold as "autoReloadThreshold",
           auto_reload_amount as "autoReloadAmount"`,
        [newBalance, userId]
      );

      // Record transaction
      await client.query(
        `INSERT INTO prepaid_credit_transactions
          (user_id, amount, type, description, balance_before, balance_after)
        VALUES ($1, $2, 'adjustment', $3, $4, $5)`,
        [
          userId,
          amount,
          `Admin adjustment by user ${adminId}: ${reason}`,
          currentBalance.balance,
          newBalance,
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
