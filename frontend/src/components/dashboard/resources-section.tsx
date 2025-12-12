'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Database,
  HardDrive,
  Wifi,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Settings,
} from 'lucide-react';

export function ResourcesSection() {

  // Mock data - would come from API
  const currentUsage = {
    cpu: { current: 45, limit: 100, percentage: 45, unit: '%' },
    memory: { current: 1536, limit: 2048, percentage: 75, unit: 'MB' },
    storage: { current: 3584, limit: 10240, percentage: 35, unit: 'MB' },
    bandwidth: { current: 25600, limit: 102400, unit: 'MB' },
  };

  const billing = {
    currentPeriod: {
      total: 45.67,
      cpu: 12.34,
      memory: 15.89,
      storage: 8.44,
      bandwidth: 9.0,
    },
    forecast: {
      amount: 52.3,
      trend: 'increasing' as const,
      confidence: 0.85,
    },
  };

  const alerts = [
    {
      id: 1,
      type: 'memory',
      message: 'Memory usage above 75%',
      severity: 'warning',
      timestamp: '10 minutes ago',
    },
  ];

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} GB`;
    }
    return `${bytes} MB`;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Current Usage Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Usage</CardTitle>
          <CardDescription>Real-time monitoring of your resource consumption</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CPU */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">CPU</span>
                </div>
                <span className={`text-sm font-bold ${getUsageColor(currentUsage.cpu.percentage)}`}>
                  {currentUsage.cpu.current}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${currentUsage.cpu.percentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {currentUsage.cpu.current}% of {currentUsage.cpu.limit}%
              </p>
            </div>

            {/* Memory */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Memory</span>
                </div>
                <span className={`text-sm font-bold ${getUsageColor(currentUsage.memory.percentage)}`}>
                  {currentUsage.memory.percentage}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${currentUsage.memory.percentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {formatBytes(currentUsage.memory.current)} of {formatBytes(currentUsage.memory.limit)}
              </p>
            </div>

            {/* Storage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Storage</span>
                </div>
                <span className={`text-sm font-bold ${getUsageColor(currentUsage.storage.percentage)}`}>
                  {currentUsage.storage.percentage}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${currentUsage.storage.percentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {formatBytes(currentUsage.storage.current)} of {formatBytes(currentUsage.storage.limit)}
              </p>
            </div>

            {/* Bandwidth */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Bandwidth</span>
                </div>
                <span className="text-sm font-bold text-primary">
                  {formatBytes(currentUsage.bandwidth.current)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${(currentUsage.bandwidth.current / currentUsage.bandwidth.limit) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {formatBytes(currentUsage.bandwidth.current)} of {formatBytes(currentUsage.bandwidth.limit)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing and Forecasts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Billing Overview</CardTitle>
                <CardDescription>Current period costs</CardDescription>
              </div>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b">
                <span className="text-2xl font-bold">${billing.currentPeriod.total.toFixed(2)}</span>
                <Badge variant="outline">Current Period</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">CPU</span>
                  <span className="font-medium">${billing.currentPeriod.cpu.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Memory</span>
                  <span className="font-medium">${billing.currentPeriod.memory.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Storage</span>
                  <span className="font-medium">${billing.currentPeriod.storage.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Bandwidth</span>
                  <span className="font-medium">${billing.currentPeriod.bandwidth.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Usage Forecast</CardTitle>
                <CardDescription>Predicted costs for next period</CardDescription>
              </div>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b">
                <span className="text-2xl font-bold">${billing.forecast.amount.toFixed(2)}</span>
                <Badge variant={billing.forecast.trend === 'increasing' ? 'destructive' : 'success'}>
                  {billing.forecast.trend}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-medium">{(billing.forecast.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Change</span>
                  <span className="font-medium text-red-500">
                    +${(billing.forecast.amount - billing.currentPeriod.total).toFixed(2)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                Based on your usage patterns over the last 30 days
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Alerts</CardTitle>
                <CardDescription>Resource usage warnings</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-950"
                >
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{alert.timestamp}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Dismiss
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
