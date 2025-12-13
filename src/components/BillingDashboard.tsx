import React, { useState, useEffect } from 'react';
import './BillingDashboard.css';

interface Subscription {
  tier: string;
  status: string;
  billingCycle: string;
  amount: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

interface Usage {
  period: {
    start: string;
    end: string;
  };
  metrics: Record<string, {
    value: number;
    cost: number;
    unit: string;
  }>;
  totalCost: number;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
}

const BillingDashboard: React.FC = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      // Fetch subscription
      const subResponse = await fetch('/api/subscriptions/current');
      const subData = await subResponse.json();
      setSubscription(subData.subscription);

      // Fetch usage
      const usageResponse = await fetch('/api/usage/current');
      const usageData = await usageResponse.json();
      setUsage(usageData.usage);

      // Fetch invoices
      const invoiceResponse = await fetch('/api/billing/invoices?limit=10');
      const invoiceData = await invoiceResponse.json();
      setInvoices(invoiceData.invoices);
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: '#48bb78',
      paid: '#48bb78',
      cancelled: '#fc8181',
      open: '#ed8936',
      pending: '#ecc94b',
    };
    return colors[status] || '#a0aec0';
  };

  if (loading) {
    return <div className="billing-loading">Loading billing information...</div>;
  }

  return (
    <div className="billing-dashboard">
      <div className="billing-header">
        <h1>Billing & Usage</h1>
        <p>Manage your subscription and view usage details</p>
      </div>

      {/* Current Subscription */}
      <div className="billing-section subscription-section">
        <h2>Current Subscription</h2>
        <div className="subscription-card">
          <div className="subscription-info">
            <div className="subscription-tier">
              <h3>{subscription?.tier.toUpperCase()} PLAN</h3>
              <span
                className="status-badge"
                style={{ backgroundColor: getStatusColor(subscription?.status || '') }}
              >
                {subscription?.status}
              </span>
            </div>
            <div className="subscription-details">
              <div className="detail-item">
                <span className="label">Billing Cycle:</span>
                <span className="value">{subscription?.billingCycle}</span>
              </div>
              <div className="detail-item">
                <span className="label">Amount:</span>
                <span className="value">
                  {formatCurrency(subscription?.amount || 0)}
                  /{subscription?.billingCycle === 'yearly' ? 'year' : 'month'}
                </span>
              </div>
              {subscription?.currentPeriodStart && (
                <div className="detail-item">
                  <span className="label">Current Period:</span>
                  <span className="value">
                    {formatDate(subscription.currentPeriodStart)} -{' '}
                    {formatDate(subscription.currentPeriodEnd)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="subscription-actions">
            <button className="btn-upgrade">Upgrade Plan</button>
            <button className="btn-manage">Manage Subscription</button>
          </div>
        </div>
      </div>

      {/* Current Usage */}
      <div className="billing-section usage-section">
        <h2>Current Usage</h2>
        <div className="usage-grid">
          {usage?.metrics && Object.entries(usage.metrics).map(([key, metric]) => (
            <div key={key} className="usage-card">
              <div className="usage-icon">
                {key === 'deployment_hours' && '⚡'}
                {key === 'storage' && '💾'}
                {key === 'bandwidth' && '🌐'}
                {key === 'ai_api_usage' && '🤖'}
              </div>
              <div className="usage-details">
                <h3>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
                <p className="usage-value">
                  {metric.value.toFixed(2)} {metric.unit}
                </p>
                <p className="usage-cost">{formatCurrency(metric.cost)}</p>
              </div>
            </div>
          ))}
        </div>
        {usage && (
          <div className="usage-total">
            <span>Total Usage Cost:</span>
            <span className="total-amount">{formatCurrency(usage.totalCost)}</span>
          </div>
        )}
      </div>

      {/* Invoice History */}
      <div className="billing-section invoices-section">
        <h2>Invoice History</h2>
        <div className="invoices-table">
          <table>
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="no-invoices">
                    No invoices yet
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="invoice-number">{invoice.invoiceNumber}</td>
                    <td>{formatDate(invoice.issuedAt)}</td>
                    <td className="invoice-amount">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(invoice.status) }}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-view"
                        onClick={() => window.open(`/api/billing/invoices/${invoice.id}`, '_blank')}
                      >
                        View
                      </button>
                      {invoice.status !== 'paid' && (
                        <button className="btn-pay">Pay Now</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="billing-section payment-methods-section">
        <div className="section-header">
          <h2>Payment Methods</h2>
          <button className="btn-add">Add Payment Method</button>
        </div>
        <div className="payment-methods">
          <p className="no-payment-methods">No payment methods added yet</p>
        </div>
      </div>
    </div>
  );
};

export default BillingDashboard;
