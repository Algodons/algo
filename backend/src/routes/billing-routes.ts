import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { BillingService } from '../services/billing-service';

export function createBillingRoutes(pool: Pool) {
  const router = Router();
  const billingService = new BillingService(pool);

  /**
   * GET /api/billing/invoices
   * Get user's invoices
   */
  router.get('/invoices', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { limit } = req.query;
      const invoices = await billingService.getUserInvoices(
        req.user.id,
        limit ? parseInt(limit as string) : 20
      );

      res.json({ invoices });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });

  /**
   * GET /api/billing/invoices/:invoiceId
   * Get invoice details with line items
   */
  router.get('/invoices/:invoiceId', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { invoiceId } = req.params;
      const invoice = await billingService.getInvoiceDetails(
        parseInt(invoiceId)
      );

      // Verify ownership
      if (invoice.userId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json({ invoice });
    } catch (error: any) {
      console.error('Error fetching invoice:', error);
      res.status(404).json({ error: error.message || 'Invoice not found' });
    }
  });

  /**
   * POST /api/billing/invoices/:invoiceId/pay
   * Process payment for an invoice
   */
  router.post('/invoices/:invoiceId/pay', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { invoiceId } = req.params;
      const { paymentMethodId, provider } = req.body;

      if (!paymentMethodId) {
        return res.status(400).json({ error: 'Payment method ID is required' });
      }

      const result = await billingService.processPayment(
        parseInt(invoiceId),
        paymentMethodId,
        provider || 'stripe'
      );

      if (result.success) {
        res.json({ 
          success: true,
          transactionId: result.transactionId,
          message: 'Payment processed successfully' 
        });
      } else {
        res.status(400).json({ 
          success: false,
          error: result.error || 'Payment failed' 
        });
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      res.status(500).json({ error: error.message || 'Failed to process payment' });
    }
  });

  /**
   * GET /api/billing/payment-methods
   * Get user's payment methods
   */
  router.get('/payment-methods', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const paymentMethods = await billingService.getPaymentMethods(req.user.id);

      res.json({ paymentMethods });
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      res.status(500).json({ error: 'Failed to fetch payment methods' });
    }
  });

  /**
   * POST /api/billing/payment-methods
   * Add a new payment method
   */
  router.post('/payment-methods', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { type, provider, providerPaymentMethodId, details } = req.body;

      if (!type || !provider || !providerPaymentMethodId) {
        return res.status(400).json({ 
          error: 'Type, provider, and provider payment method ID are required' 
        });
      }

      const paymentMethod = await billingService.addPaymentMethod(
        req.user.id,
        type,
        provider,
        providerPaymentMethodId,
        details || {}
      );

      res.json({ 
        success: true,
        paymentMethod,
        message: 'Payment method added successfully' 
      });
    } catch (error: any) {
      console.error('Error adding payment method:', error);
      res.status(500).json({ error: error.message || 'Failed to add payment method' });
    }
  });

  /**
   * PUT /api/billing/payment-methods/:paymentMethodId/default
   * Set default payment method
   */
  router.put('/payment-methods/:paymentMethodId/default', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { paymentMethodId } = req.params;

      await billingService.setDefaultPaymentMethod(
        req.user.id,
        parseInt(paymentMethodId)
      );

      res.json({ 
        success: true,
        message: 'Default payment method updated' 
      });
    } catch (error: any) {
      console.error('Error setting default payment method:', error);
      res.status(500).json({ error: error.message || 'Failed to update default payment method' });
    }
  });

  /**
   * POST /api/billing/webhooks/:provider
   * Handle payment gateway webhooks
   */
  router.post('/webhooks/:provider', async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      const signature = req.headers['stripe-signature'] || 
                       req.headers['paypal-transmission-sig'] as string;

      const payload = req.body;
      const eventType = payload.type || payload.event_type;
      const eventId = payload.id;

      await billingService.handleWebhook(
        provider,
        eventType,
        eventId,
        payload,
        signature
      );

      res.json({ received: true });
    } catch (error) {
      console.error('Error handling webhook:', error);
      res.status(400).json({ error: 'Webhook processing failed' });
    }
  });

  return router;
}
