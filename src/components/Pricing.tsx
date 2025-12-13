import React, { useState, useEffect } from 'react';
import './Pricing.css';

interface PricingPlan {
  id: number;
  name: string;
  displayName: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  storageMb: number;
  computeHoursMonthly: number;
  bandwidthGbMonthly: number;
  concurrentDeployments: number;
  features: Record<string, any>;
  hasPrioritySupport: boolean;
  hasAdvancedAnalytics: boolean;
  hasSso: boolean;
  hasTeamManagement: boolean;
  bringOwnApiKeys: boolean;
  platformManagedAi: boolean;
}

const Pricing: React.FC = () => {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/subscriptions/plans');
      if (!response.ok) {
        throw new Error('Failed to fetch plans');
      }
      const data = await response.json();
      setPlans(data.plans);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planName: string) => {
    try {
      const response = await fetch('/api/subscriptions/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planName,
          billingCycle,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to subscribe');
      }

      alert('Subscription successful!');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const formatPrice = (plan: PricingPlan) => {
    const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
    if (price === 0) {
      return plan.name === 'enterprise' ? 'Custom' : 'Free';
    }
    return `$${price}`;
  };

  const formatStorage = (mb: number) => {
    if (mb === -1) return 'Unlimited';
    if (mb >= 1024) return `${(mb / 1024).toFixed(0)} GB`;
    return `${mb} MB`;
  };

  const formatCompute = (hours: number) => {
    if (hours === -1) return 'Unlimited';
    return `${hours} hours/month`;
  };

  const formatBandwidth = (gb: number) => {
    if (gb === -1) return 'Unlimited';
    return `${gb} GB/month`;
  };

  if (loading) {
    return <div className="pricing-loading">Loading pricing plans...</div>;
  }

  if (error) {
    return <div className="pricing-error">Error: {error}</div>;
  }

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <h1>Choose Your Plan</h1>
        <p>Select the perfect plan for your needs</p>
        
        <div className="billing-toggle">
          <button
            className={billingCycle === 'monthly' ? 'active' : ''}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button
            className={billingCycle === 'yearly' ? 'active' : ''}
            onClick={() => setBillingCycle('yearly')}
          >
            Yearly
            <span className="save-badge">Save 17%</span>
          </button>
        </div>
      </div>

      <div className="pricing-grid">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`pricing-card ${plan.name === 'pro' ? 'featured' : ''}`}
          >
            {plan.name === 'pro' && (
              <div className="featured-badge">Most Popular</div>
            )}
            
            <div className="plan-header">
              <h2>{plan.displayName}</h2>
              <p className="plan-description">{plan.description}</p>
              <div className="plan-price">
                <span className="price">{formatPrice(plan)}</span>
                {plan.priceMonthly > 0 && (
                  <span className="period">
                    /{billingCycle === 'yearly' ? 'year' : 'month'}
                  </span>
                )}
              </div>
            </div>

            <div className="plan-features">
              <div className="feature">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>{formatStorage(plan.storageMb)} storage</span>
              </div>

              <div className="feature">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>{formatCompute(plan.computeHoursMonthly)}</span>
              </div>

              <div className="feature">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>{formatBandwidth(plan.bandwidthGbMonthly)} bandwidth</span>
              </div>

              <div className="feature">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>
                  {plan.concurrentDeployments === -1
                    ? 'Unlimited'
                    : plan.concurrentDeployments}{' '}
                  concurrent {plan.concurrentDeployments === 1 ? 'deployment' : 'deployments'}
                </span>
              </div>

              {plan.bringOwnApiKeys && (
                <div className="feature">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Bring your own AI API keys</span>
                </div>
              )}

              {plan.hasPrioritySupport && (
                <div className="feature">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Priority support</span>
                </div>
              )}

              {plan.hasAdvancedAnalytics && (
                <div className="feature">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Advanced analytics</span>
                </div>
              )}

              {plan.hasSso && (
                <div className="feature">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Single Sign-On (SSO)</span>
                </div>
              )}

              {plan.hasTeamManagement && (
                <div className="feature">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Team management</span>
                </div>
              )}

              {!plan.hasPrioritySupport && (
                <div className="feature">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Community forum support</span>
                </div>
              )}
            </div>

            <button
              className="subscribe-button"
              onClick={() => handleSubscribe(plan.name)}
              disabled={plan.name === 'enterprise'}
            >
              {plan.name === 'enterprise' ? 'Contact Sales' : 'Get Started'}
            </button>
          </div>
        ))}
      </div>

      <div className="usage-based-pricing">
        <h2>Usage-Based Pricing</h2>
        <p>Pay only for what you use beyond your plan limits</p>
        <div className="usage-grid">
          <div className="usage-item">
            <h3>Deployment Hours</h3>
            <p className="usage-price">$0.01/hour</p>
            <p className="usage-desc">for active deployments</p>
          </div>
          <div className="usage-item">
            <h3>Database Storage</h3>
            <p className="usage-price">$0.10/GB/month</p>
            <p className="usage-desc">beyond your quota</p>
          </div>
          <div className="usage-item">
            <h3>Bandwidth</h3>
            <p className="usage-price">$0.05/GB</p>
            <p className="usage-desc">beyond your quota</p>
          </div>
          <div className="usage-item">
            <h3>AI API Usage</h3>
            <p className="usage-price">Cost + 20%</p>
            <p className="usage-desc">platform-managed keys</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
