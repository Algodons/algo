import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { Pool } from 'pg';

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  data?: Record<string, any>;
}

export interface SMSOptions {
  to: string;
  message: string;
}

export class NotificationService {
  private emailTransporter: nodemailer.Transporter | null = null;
  private twilioClient: twilio.Twilio | null = null;
  private useSendGrid: boolean = false;

  constructor(private pool: Pool) {
    this.initializeEmailService();
    this.initializeSMSService();
  }

  /**
   * Initialize email service (SendGrid or SMTP)
   */
  private initializeEmailService() {
    const sendGridKey = process.env.SENDGRID_API_KEY;
    
    if (sendGridKey) {
      // Use SendGrid
      sgMail.setApiKey(sendGridKey);
      this.useSendGrid = true;
      console.log('Email service initialized: SendGrid');
    } else if (process.env.SMTP_HOST) {
      // Use SMTP
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
      console.log('Email service initialized: SMTP');
    } else {
      console.warn('No email service configured (SendGrid or SMTP)');
    }
  }

  /**
   * Initialize SMS service (Twilio)
   */
  private initializeSMSService() {
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;

    if (twilioAccountSid && twilioAuthToken) {
      this.twilioClient = twilio(twilioAccountSid, twilioAuthToken);
      console.log('SMS service initialized: Twilio');
    } else {
      console.warn('Twilio not configured for SMS notifications');
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const fromEmail = process.env.BILLING_EMAIL_FROM || process.env.SMTP_FROM || 'noreply@algo-ide.com';

      if (this.useSendGrid) {
        // Send via SendGrid
        const msg = {
          to: options.to,
          from: fromEmail,
          subject: options.subject,
          text: options.text || '',
          html: options.html || options.text || '',
        };

        await sgMail.send(msg);
        console.log(`Email sent to ${options.to} via SendGrid`);
        return true;
      } else if (this.emailTransporter) {
        // Send via SMTP
        const mailOptions = {
          from: fromEmail,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        };

        await this.emailTransporter.sendMail(mailOptions);
        console.log(`Email sent to ${options.to} via SMTP`);
        return true;
      } else {
        console.error('No email service available');
        return false;
      }
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMS(options: SMSOptions): Promise<boolean> {
    try {
      if (!this.twilioClient) {
        console.error('Twilio not configured for SMS');
        return false;
      }

      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
      if (!twilioPhoneNumber) {
        console.error('TWILIO_PHONE_NUMBER not configured');
        return false;
      }

      await this.twilioClient.messages.create({
        body: options.message,
        from: twilioPhoneNumber,
        to: options.to,
      });

      console.log(`SMS sent to ${options.to}`);
      return true;
    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  }

  /**
   * Send usage alert notification
   */
  async sendUsageAlert(
    userId: number,
    metricType: string,
    currentValue: number,
    thresholdValue: number,
    percentageUsed: number,
    notificationChannels: string[]
  ): Promise<void> {
    try {
      // Get user contact information
      const userResult = await this.pool.query(
        `SELECT email, name FROM users WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        console.error(`User ${userId} not found`);
        return;
      }

      const user = userResult.rows[0];
      const metricLabel = metricType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      // Prepare email content
      const subject = `⚠️ Usage Alert: ${metricLabel} at ${percentageUsed.toFixed(1)}%`;
      const htmlContent = `
        <h2>Usage Alert</h2>
        <p>Hello ${user.name},</p>
        <p>Your ${metricLabel} usage has reached <strong>${percentageUsed.toFixed(1)}%</strong> of your plan limit.</p>
        <ul>
          <li><strong>Current Usage:</strong> ${currentValue.toFixed(2)}</li>
          <li><strong>Plan Limit:</strong> ${thresholdValue.toFixed(2)}</li>
          <li><strong>Percentage Used:</strong> ${percentageUsed.toFixed(1)}%</li>
        </ul>
        <p>Consider upgrading your plan or monitoring your usage to avoid overages.</p>
        <p>View your usage dashboard: <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing">Billing Dashboard</a></p>
        <hr>
        <p style="color: #666; font-size: 12px;">This is an automated notification from Algo Cloud IDE.</p>
      `;

      const textContent = `
Usage Alert: ${metricLabel} at ${percentageUsed.toFixed(1)}%

Hello ${user.name},

Your ${metricLabel} usage has reached ${percentageUsed.toFixed(1)}% of your plan limit.

Current Usage: ${currentValue.toFixed(2)}
Plan Limit: ${thresholdValue.toFixed(2)}
Percentage Used: ${percentageUsed.toFixed(1)}%

Consider upgrading your plan or monitoring your usage to avoid overages.

View your usage dashboard at: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing
      `;

      // Send email if requested
      if (notificationChannels.includes('email')) {
        await this.sendEmail({
          to: user.email,
          subject,
          html: htmlContent,
          text: textContent,
        });
      }

      // Send SMS if requested
      if (notificationChannels.includes('sms')) {
        // Get user phone number from notification preferences
        const phoneResult = await this.pool.query(
          `SELECT phone_number FROM user_contact_info WHERE user_id = $1`,
          [userId]
        );

        if (phoneResult.rows.length > 0 && phoneResult.rows[0].phone_number) {
          const smsMessage = `Usage Alert: ${metricLabel} at ${percentageUsed.toFixed(0)}%. Current: ${currentValue.toFixed(0)}, Limit: ${thresholdValue.toFixed(0)}. View details at ${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing`;
          
          await this.sendSMS({
            to: phoneResult.rows[0].phone_number,
            message: smsMessage,
          });
        }
      }

      // Dashboard notification is handled via WebSocket in real-time
      // This would be integrated with Socket.IO in the main application
    } catch (error) {
      console.error('Error sending usage alert:', error);
    }
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmation(
    userId: number,
    invoiceId: number,
    amount: number,
    currency: string
  ): Promise<void> {
    try {
      const userResult = await this.pool.query(
        `SELECT email, name FROM users WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        return;
      }

      const user = userResult.rows[0];
      const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(amount);

      const subject = `Payment Confirmation - ${formattedAmount}`;
      const htmlContent = `
        <h2>Payment Received</h2>
        <p>Hello ${user.name},</p>
        <p>We've received your payment of <strong>${formattedAmount}</strong>.</p>
        <p><strong>Invoice ID:</strong> ${invoiceId}</p>
        <p>Thank you for your payment. You can view your invoice details in your <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing">billing dashboard</a>.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">This is an automated notification from Algo Cloud IDE.</p>
      `;

      await this.sendEmail({
        to: user.email,
        subject,
        html: htmlContent,
      });
    } catch (error) {
      console.error('Error sending payment confirmation:', error);
    }
  }

  /**
   * Send payment failure notification
   */
  async sendPaymentFailure(
    userId: number,
    invoiceId: number,
    amount: number,
    currency: string,
    reason: string
  ): Promise<void> {
    try {
      const userResult = await this.pool.query(
        `SELECT email, name FROM users WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        return;
      }

      const user = userResult.rows[0];
      const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(amount);

      const subject = `Payment Failed - Action Required`;
      const htmlContent = `
        <h2>Payment Failed</h2>
        <p>Hello ${user.name},</p>
        <p>We were unable to process your payment of <strong>${formattedAmount}</strong>.</p>
        <p><strong>Invoice ID:</strong> ${invoiceId}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please update your payment method or try again in your <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing">billing dashboard</a>.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">This is an automated notification from Algo Cloud IDE.</p>
      `;

      await this.sendEmail({
        to: user.email,
        subject,
        html: htmlContent,
      });
    } catch (error) {
      console.error('Error sending payment failure notification:', error);
    }
  }
}
