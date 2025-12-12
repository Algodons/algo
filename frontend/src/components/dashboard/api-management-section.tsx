'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Key, Webhook, BarChart3, Copy, Trash2, Plus, CheckCircle2, XCircle } from 'lucide-react';

export function ApiManagementSection() {
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  // Mock data - would come from API
  const apiKeys = [
    {
      id: 1,
      name: 'Production API Key',
      prefix: 'algo_sk_prod',
      scopes: ['read', 'write', 'deploy'],
      lastUsed: '5 minutes ago',
      createdAt: '2024-01-15',
      isActive: true,
    },
    {
      id: 2,
      name: 'CI/CD Pipeline',
      prefix: 'algo_sk_cicd',
      scopes: ['read', 'deploy'],
      lastUsed: '2 hours ago',
      createdAt: '2024-02-01',
      isActive: true,
    },
    {
      id: 3,
      name: 'Development Key',
      prefix: 'algo_sk_dev_',
      scopes: ['read'],
      lastUsed: 'Never',
      createdAt: '2024-03-10',
      isActive: false,
    },
  ];

  const webhooks = [
    {
      id: 1,
      name: 'Deploy Notifications',
      url: 'https://hooks.slack.com/services/...',
      events: ['deployment.success', 'deployment.failure'],
      lastTriggered: '1 hour ago',
      status: 'active',
      deliveryRate: 98.5,
    },
    {
      id: 2,
      name: 'Build Status',
      url: 'https://discord.com/api/webhooks/...',
      events: ['build.started', 'build.completed'],
      lastTriggered: '3 hours ago',
      status: 'active',
      deliveryRate: 100,
    },
  ];

  const analytics = {
    totalRequests: 15243,
    successRate: 99.2,
    averageResponseTime: 145,
    topEndpoints: [
      { endpoint: '/api/projects', count: 5432, avgTime: 98 },
      { endpoint: '/api/deployments', count: 3210, avgTime: 234 },
      { endpoint: '/api/resources', count: 2876, avgTime: 123 },
    ],
  };

  return (
    <Tabs defaultValue="api-keys" className="space-y-6">
      <TabsList>
        <TabsTrigger value="api-keys">API Keys</TabsTrigger>
        <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>

      {/* API Keys Tab */}
      <TabsContent value="api-keys" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Manage your API authentication keys</CardDescription>
              </div>
              <Dialog open={showCreateKey} onOpenChange={setShowCreateKey}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Key
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create API Key</DialogTitle>
                    <DialogDescription>Generate a new API key for your applications</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="keyName">Key Name</Label>
                      <Input
                        id="keyName"
                        placeholder="Production API Key"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Permissions</Label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" defaultChecked />
                          <span className="text-sm">Read access</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" defaultChecked />
                          <span className="text-sm">Write access</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" />
                          <span className="text-sm">Deploy access</span>
                        </label>
                      </div>
                    </div>
                    <Button className="w-full">Generate API Key</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-start gap-3 flex-1">
                    <Key className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{key.name}</h4>
                        {key.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <code className="px-2 py-1 rounded bg-muted">{key.prefix}...</code>
                        <span>Last used: {key.lastUsed}</span>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {key.scopes.map((scope) => (
                          <Badge key={scope} variant="outline" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Webhooks Tab */}
      <TabsContent value="webhooks" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Webhooks</CardTitle>
                <CardDescription>Configure webhook endpoints for event notifications</CardDescription>
              </div>
              <Dialog open={showCreateWebhook} onOpenChange={setShowCreateWebhook}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Webhook
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Webhook</DialogTitle>
                    <DialogDescription>Configure a new webhook endpoint</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="webhookName">Webhook Name</Label>
                      <Input id="webhookName" placeholder="Deploy Notifications" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="webhookUrl">Payload URL</Label>
                      <Input id="webhookUrl" placeholder="https://example.com/webhook" />
                    </div>
                    <div className="space-y-2">
                      <Label>Events</Label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" />
                          <span className="text-sm">deployment.success</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" />
                          <span className="text-sm">deployment.failure</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" />
                          <span className="text-sm">build.started</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" />
                          <span className="text-sm">build.completed</span>
                        </label>
                      </div>
                    </div>
                    <Button className="w-full">Create Webhook</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-start gap-3 flex-1">
                    <Webhook className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{webhook.name}</h4>
                        <Badge variant="success">Active</Badge>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        <code className="text-xs">{webhook.url}</code>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {webhook.events.map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Last triggered: {webhook.lastTriggered}</span>
                        <span>Delivery rate: {webhook.deliveryRate}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Analytics Tab */}
      <TabsContent value="analytics" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalRequests.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Success Rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{analytics.successRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Avg Response Time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.averageResponseTime}ms</div>
              <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Top Endpoints</CardTitle>
            <CardDescription>Most requested API endpoints</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topEndpoints.map((endpoint, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <code className="text-sm">{endpoint.endpoint}</code>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span>{endpoint.count.toLocaleString()} requests</span>
                      <span>Avg: {endpoint.avgTime}ms</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{((endpoint.count / analytics.totalRequests) * 100).toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
