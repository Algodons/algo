'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Users, Database, Globe } from 'lucide-react';
import { TeamBilling, MemberUsage } from '@/lib/types/collaboration';
import { billingApi } from '@/lib/team-api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TeamBillingDashboardProps {
  organizationId: number;
}

export function TeamBillingDashboard({ organizationId }: TeamBillingDashboardProps) {
  const [currentBilling, setCurrentBilling] = useState<TeamBilling | null>(null);
  const [memberUsage, setMemberUsage] = useState<MemberUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBillingData();
  }, [organizationId]);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const [billing, usage] = await Promise.all([
        billingApi.getCurrent(organizationId),
        billingApi.getMemberUsage(organizationId),
      ]);
      setCurrentBilling(billing);
      setMemberUsage(usage);
    } catch (err) {
      console.error('Failed to load billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toFixed(decimals);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentBilling) {
    return (
      <Card className="p-8 text-center">
        <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium mb-2">No billing data</h3>
        <p className="text-gray-500">Billing information will appear here</p>
      </Card>
    );
  }

  const billingPeriodDays = Math.ceil(
    (new Date(currentBilling.billing_period_end).getTime() -
      new Date(currentBilling.billing_period_start).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const daysRemaining = Math.ceil(
    (new Date(currentBilling.billing_period_end).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Billing</h2>
          <p className="text-sm text-gray-500 mt-1">
            Current billing period: {new Date(currentBilling.billing_period_start).toLocaleDateString()} -{' '}
            {new Date(currentBilling.billing_period_end).toLocaleDateString()}
          </p>
        </div>
        <Button variant="outline">View All Invoices</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Cost</span>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold">
            {formatCurrency(currentBilling.total_cost, currentBilling.currency)}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {daysRemaining} days remaining
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Compute Hours</span>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold">
            {formatNumber(currentBilling.total_compute_hours)}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ~{formatNumber(currentBilling.total_compute_hours / billingPeriodDays)} hrs/day
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Storage</span>
            <Database className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold">
            {formatNumber(currentBilling.total_storage_gb)}
            <span className="text-lg font-normal text-gray-500 ml-1">GB</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Total used</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Bandwidth</span>
            <Globe className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-3xl font-bold">
            {formatNumber(currentBilling.total_bandwidth_gb)}
            <span className="text-lg font-normal text-gray-500 ml-1">GB</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Total transferred</p>
        </Card>
      </div>

      {/* Usage Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Usage by Team Member</h3>
        
        {memberUsage.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No usage data available</p>
        ) : (
          <div className="space-y-3">
            {memberUsage.map((usage) => (
              <div
                key={usage.user_id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{usage.user_name || `User ${usage.user_id}`}</div>
                    <div className="text-sm text-gray-500">
                      {formatNumber(usage.compute_hours)} hrs • {formatNumber(usage.storage_gb)} GB storage • {formatNumber(usage.bandwidth_gb)} GB bandwidth
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-lg">
                    {formatCurrency(usage.total_cost, currentBilling.currency)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {((usage.total_cost / currentBilling.total_cost) * 100).toFixed(1)}% of total
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Cost Breakdown Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Cost Breakdown</h3>
        <div className="space-y-3">
          {[
            {
              label: 'Compute',
              value: currentBilling.total_compute_hours * 0.10, // Example rate
              color: 'bg-blue-500',
            },
            {
              label: 'Storage',
              value: currentBilling.total_storage_gb * 0.02,
              color: 'bg-purple-500',
            },
            {
              label: 'Bandwidth',
              value: currentBilling.total_bandwidth_gb * 0.05,
              color: 'bg-orange-500',
            },
          ].map((item) => {
            const percentage = (item.value / currentBilling.total_cost) * 100;
            return (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-gray-600">
                    {formatCurrency(item.value, currentBilling.currency)} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${item.color} h-2 rounded-full transition-all`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
