import { Pool } from 'pg';

export interface Invoice {
  id: number;
  userId: number;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  pdfUrl?: string;
  issuedAt?: Date;
  dueAt?: Date;
  paidAt?: Date;
}

export interface PaymentMethod {
  id: number;
  userId: number;
  type: string;
  provider: string;
  lastFour?: string;
  brand?: string;
  isDefault: boolean;
}

export class BillingService {
  constructor(private pool: Pool) {}

  /**
   * Generate invoice for subscription billing
   */
  async generateSubscriptionInvoice(
    userId: number,
    subscriptionId: number,
    amount: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Invoice> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Generate unique invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Create billing period record
      const billingPeriodResult = await client.query(
        `INSERT INTO billing_periods 
          (user_id, period_start, period_end, total_cost, status)
        VALUES ($1, $2, $3, $4, 'pending')
        RETURNING id`,
        [userId, periodStart, periodEnd, amount]
      );

      const billingPeriodId = billingPeriodResult.rows[0].id;

      // Create invoice
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // 7 days payment term

      const invoiceResult = await client.query(
        `INSERT INTO invoices 
          (user_id, invoice_number, billing_period_id, amount, currency, 
           status, issued_at, due_at)
        VALUES ($1, $2, $3, $4, $5, 'open', CURRENT_TIMESTAMP, $6)
        RETURNING 
          id, user_id as "userId", invoice_number as "invoiceNumber",
          amount, currency, status, issued_at as "issuedAt", due_at as "dueAt"`,
        [userId, invoiceNumber, billingPeriodId, amount, 'USD', dueDate]
      );

      const invoice = invoiceResult.rows[0];

      // Add line item for subscription
      await client.query(
        `INSERT INTO invoice_line_items 
          (invoice_id, description, item_type, quantity, unit_price, amount)
        VALUES ($1, $2, 'subscription', 1, $3, $3)`,
        [invoice.id, 'Subscription fee', amount]
      );

      await client.query('COMMIT');
      return invoice;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate invoice for usage-based billing
   */
  async generateUsageInvoice(userId: number, periodStart: Date, periodEnd: Date): Promise<Invoice> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get usage for the period
      const usageResult = await client.query(
        `SELECT 
          metric_type,
          SUM(value) as total_value,
          SUM(cost) as total_cost,
          unit
        FROM usage_metrics
        WHERE user_id = $1
          AND billing_period_start = $2
          AND billing_period_end = $3
        GROUP BY metric_type, unit`,
        [userId, periodStart, periodEnd]
      );

      const totalAmount = usageResult.rows.reduce(
        (sum, row) => sum + parseFloat(row.total_cost),
        0
      );

      if (totalAmount === 0) {
        await client.query('ROLLBACK');
        throw new Error('No usage to bill');
      }

      // Generate invoice
      const invoiceNumber = await this.generateInvoiceNumber();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const billingPeriodResult = await client.query(
        `INSERT INTO billing_periods 
          (user_id, period_start, period_end, total_cost, status)
        VALUES ($1, $2, $3, $4, 'pending')
        RETURNING id`,
        [userId, periodStart, periodEnd, totalAmount]
      );

      const invoiceResult = await client.query(
        `INSERT INTO invoices 
          (user_id, invoice_number, billing_period_id, amount, currency, 
           status, issued_at, due_at)
        VALUES ($1, $2, $3, $4, 'USD', 'open', CURRENT_TIMESTAMP, $5)
        RETURNING 
          id, user_id as "userId", invoice_number as "invoiceNumber",
          amount, currency, status, issued_at as "issuedAt", due_at as "dueAt"`,
        [userId, invoiceNumber, billingPeriodResult.rows[0].id, totalAmount, dueDate]
      );

      const invoice = invoiceResult.rows[0];

      // Add line items for each usage type
      for (const row of usageResult.rows) {
        const description = this.getUsageDescription(row.metric_type);
        await client.query(
          `INSERT INTO invoice_line_items 
            (invoice_id, description, item_type, quantity, unit_price, amount)
          VALUES ($1, $2, 'usage', $3, $4, $5)`,
          [
            invoice.id,
            description,
            parseFloat(row.total_value),
            parseFloat(row.total_cost) / parseFloat(row.total_value),
            parseFloat(row.total_cost),
          ]
        );
      }

      await client.query('COMMIT');
      return invoice;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Process payment for an invoice
   */
  async processPayment(
    invoiceId: number,
    paymentMethodId: number,
    provider: string = 'stripe'
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get invoice details
      const invoiceResult = await client.query(
        `SELECT id, user_id, amount, currency, status
         FROM invoices
         WHERE id = $1`,
        [invoiceId]
      );

      if (invoiceResult.rows.length === 0) {
        throw new Error('Invoice not found');
      }

      const invoice = invoiceResult.rows[0];

      if (invoice.status === 'paid') {
        await client.query('ROLLBACK');
        return { success: false, error: 'Invoice already paid' };
      }

      // Get payment method
      const pmResult = await client.query(
        `SELECT id, provider, provider_payment_method_id
         FROM stored_payment_methods
         WHERE id = $1 AND user_id = $2`,
        [paymentMethodId, invoice.user_id]
      );

      if (pmResult.rows.length === 0) {
        throw new Error('Payment method not found');
      }

      const paymentMethod = pmResult.rows[0];

      // Process payment via provider (simplified - would call actual payment gateway)
      const paymentResult = await this.processPaymentViaProvider(
        provider,
        paymentMethod.provider_payment_method_id,
        invoice.amount,
        invoice.currency
      );

      if (paymentResult.success) {
        // Update invoice status
        await client.query(
          `UPDATE invoices
           SET status = 'paid', paid_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [invoiceId]
        );

        // Record billing history
        await client.query(
          `INSERT INTO billing_history
            (user_id, invoice_id, transaction_type, amount, currency, 
             status, payment_method, provider, provider_transaction_id, description)
          VALUES ($1, $2, 'subscription', $3, $4, 'completed', $5, $6, $7, $8)`,
          [
            invoice.user_id,
            invoiceId,
            invoice.amount,
            invoice.currency,
            paymentMethod.type,
            provider,
            paymentResult.transactionId,
            'Invoice payment',
          ]
        );

        // Update billing period status
        await client.query(
          `UPDATE billing_periods
           SET status = 'paid', paid_at = CURRENT_TIMESTAMP
           WHERE id = (SELECT billing_period_id FROM invoices WHERE id = $1)`,
          [invoiceId]
        );

        await client.query('COMMIT');
        return { success: true, transactionId: paymentResult.transactionId };
      } else {
        // Record payment failure
        await client.query(
          `INSERT INTO payment_failures
            (user_id, invoice_id, payment_method_id, amount, currency, 
             provider, error_code, error_message)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            invoice.user_id,
            invoiceId,
            paymentMethodId,
            invoice.amount,
            invoice.currency,
            provider,
            paymentResult.errorCode,
            paymentResult.error,
          ]
        );

        await client.query('COMMIT');
        return { success: false, error: paymentResult.error };
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get user's invoices
   */
  async getUserInvoices(userId: number, limit: number = 20): Promise<Invoice[]> {
    const result = await this.pool.query(
      `SELECT 
        id, user_id as "userId", invoice_number as "invoiceNumber",
        amount, currency, status, pdf_url as "pdfUrl",
        issued_at as "issuedAt", due_at as "dueAt", paid_at as "paidAt"
      FROM invoices
      WHERE user_id = $1
      ORDER BY issued_at DESC
      LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  /**
   * Get invoice details with line items
   */
  async getInvoiceDetails(invoiceId: number): Promise<any> {
    const invoiceResult = await this.pool.query(
      `SELECT 
        id, user_id as "userId", invoice_number as "invoiceNumber",
        amount, currency, status, pdf_url as "pdfUrl",
        issued_at as "issuedAt", due_at as "dueAt", paid_at as "paidAt"
      FROM invoices
      WHERE id = $1`,
      [invoiceId]
    );

    if (invoiceResult.rows.length === 0) {
      throw new Error('Invoice not found');
    }

    const invoice = invoiceResult.rows[0];

    const lineItemsResult = await this.pool.query(
      `SELECT 
        id, description, item_type as "itemType",
        quantity, unit_price as "unitPrice", amount
      FROM invoice_line_items
      WHERE invoice_id = $1
      ORDER BY id`,
      [invoiceId]
    );

    return {
      ...invoice,
      lineItems: lineItemsResult.rows,
    };
  }

  /**
   * Add payment method
   */
  async addPaymentMethod(
    userId: number,
    type: string,
    provider: string,
    providerPaymentMethodId: string,
    details: any
  ): Promise<PaymentMethod> {
    const result = await this.pool.query(
      `INSERT INTO stored_payment_methods
        (user_id, type, provider, provider_payment_method_id, 
         last_four, brand, email, is_default)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id, user_id as "userId", type, provider,
        last_four as "lastFour", brand, is_default as "isDefault"`,
      [
        userId,
        type,
        provider,
        providerPaymentMethodId,
        details.lastFour,
        details.brand,
        details.email,
        details.isDefault || false,
      ]
    );
    return result.rows[0];
  }

  /**
   * Get user's payment methods
   */
  async getPaymentMethods(userId: number): Promise<PaymentMethod[]> {
    const result = await this.pool.query(
      `SELECT 
        id, user_id as "userId", type, provider,
        last_four as "lastFour", brand, is_default as "isDefault"
      FROM stored_payment_methods
      WHERE user_id = $1
      ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(userId: number, paymentMethodId: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Remove default from all
      await client.query(
        `UPDATE stored_payment_methods
         SET is_default = false
         WHERE user_id = $1`,
        [userId]
      );

      // Set new default
      await client.query(
        `UPDATE stored_payment_methods
         SET is_default = true
         WHERE id = $1 AND user_id = $2`,
        [paymentMethodId, userId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Handle payment webhook
   */
  async handleWebhook(
    provider: string,
    eventType: string,
    eventId: string,
    payload: any,
    signature: string
  ): Promise<void> {
    // Verify signature (simplified - would use actual provider verification)
    const verified = await this.verifyWebhookSignature(provider, payload, signature);

    await this.pool.query(
      `INSERT INTO payment_webhooks
        (provider, event_type, event_id, payload, signature, verified)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (event_id) DO NOTHING`,
      [provider, eventType, eventId, JSON.stringify(payload), signature, verified]
    );

    if (verified) {
      // Process webhook event
      await this.processWebhookEvent(provider, eventType, payload);
    }
  }

  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const result = await this.pool.query(
      `SELECT COUNT(*) as count FROM invoices 
       WHERE EXTRACT(YEAR FROM created_at) = $1`,
      [year]
    );
    const count = parseInt(result.rows[0].count) + 1;
    return `INV-${year}-${count.toString().padStart(6, '0')}`;
  }

  /**
   * Get usage description for line items
   */
  private getUsageDescription(metricType: string): string {
    const descriptions: Record<string, string> = {
      deployment_hours: 'Deployment hours',
      storage: 'Storage usage',
      bandwidth: 'Bandwidth usage',
      ai_api_usage: 'AI API usage',
      build_minutes: 'Build minutes',
    };
    return descriptions[metricType] || metricType;
  }

  /**
   * Process payment via provider (simplified)
   * TODO: CRITICAL - Replace with actual payment gateway integration
   * This is a mock implementation for development only
   */
  private async processPaymentViaProvider(
    provider: string,
    paymentMethodId: string,
    amount: number,
    currency: string
  ): Promise<{ success: boolean; transactionId?: string; errorCode?: string; error?: string }> {
    // TODO: Integrate with actual payment providers:
    // - Stripe: const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    //           const paymentIntent = await stripe.paymentIntents.create({...});
    // - PayPal: Use PayPal SDK for payment processing
    // - Coinbase Commerce: Use Coinbase Commerce API
    
    // DEVELOPMENT MOCK - DO NOT USE IN PRODUCTION
    if (amount > 0) {
      return {
        success: true,
        transactionId: `${provider}_${Date.now()}`,
      };
    }

    return {
      success: false,
      errorCode: 'invalid_amount',
      error: 'Invalid payment amount',
    };
  }

  /**
   * Verify webhook signature
   * TODO: CRITICAL - Implement actual signature verification for security
   * This is a mock implementation for development only
   */
  private async verifyWebhookSignature(
    provider: string,
    payload: any,
    signature: string
  ): Promise<boolean> {
    // TODO: Implement actual provider verification:
    // For Stripe:
    //   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    //   const event = stripe.webhooks.constructEvent(
    //     JSON.stringify(payload),
    //     signature,
    //     process.env.STRIPE_WEBHOOK_SECRET
    //   );
    // For PayPal: Verify IPN signature using PayPal SDK
    // For Coinbase: Verify webhook signature using Coinbase SDK
    
    // DEVELOPMENT MOCK - DO NOT USE IN PRODUCTION
    // This allows any webhook through and is a SECURITY VULNERABILITY
    console.warn('WARNING: Webhook signature verification is not implemented');
    return true;
  }

  /**
   * Process webhook event
   */
  private async processWebhookEvent(provider: string, eventType: string, payload: any): Promise<void> {
    // Handle different event types
    switch (eventType) {
      case 'payment_intent.succeeded':
      case 'charge.succeeded':
        // Payment successful - already handled in processPayment
        break;
      case 'payment_intent.payment_failed':
      case 'charge.failed':
        // Handle payment failure
        break;
      case 'customer.subscription.deleted':
        // Handle subscription cancellation
        break;
      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    // Mark webhook as processed
    await this.pool.query(
      `UPDATE payment_webhooks
       SET processed = true, processed_at = CURRENT_TIMESTAMP
       WHERE event_id = $1`,
      [payload.id]
    );
  }
}
