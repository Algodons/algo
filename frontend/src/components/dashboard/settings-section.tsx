'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// Removed unused dialog component imports
import {
  User,
  Building2,
  CreditCard,
  FileText,
  Shield,
  Key as KeyIcon,
  Trash2,
  Plus,
} from 'lucide-react';

export function SettingsSection() {
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    avatarUrl: '',
  });

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Mock data
  const organizations = [
    { id: 1, name: 'Acme Corp', role: 'owner', members: 12 },
    { id: 2, name: 'Tech Startup', role: 'admin', members: 5 },
  ];

  const paymentMethods = [
    { id: 1, type: 'card', brand: 'Visa', last4: '4242', expiresAt: '12/2025', isDefault: true },
    { id: 2, type: 'card', brand: 'Mastercard', last4: '8888', expiresAt: '06/2026', isDefault: false },
  ];

  const invoices = [
    { id: 1, number: 'INV-2024-001', amount: 45.67, status: 'paid', date: '2024-03-01' },
    { id: 2, number: 'INV-2024-002', amount: 52.34, status: 'paid', date: '2024-02-01' },
    { id: 3, number: 'INV-2024-003', amount: 38.90, status: 'open', date: '2024-01-01' },
  ];

  const sshKeys = [
    { id: 1, name: 'Work Laptop', fingerprint: 'SHA256:abc123...', lastUsed: '2 days ago' },
    { id: 2, name: 'Home Desktop', fingerprint: 'SHA256:def456...', lastUsed: '1 week ago' },
  ];

  const tokens = [
    {
      id: 1,
      name: 'GitHub Actions',
      prefix: 'pat_gh_actions',
      scopes: ['read', 'write'],
      lastUsed: '1 hour ago',
    },
    { id: 2, name: 'CLI Tool', prefix: 'pat_cli_tool_', scopes: ['read'], lastUsed: 'Never' },
  ];

  return (
    <Tabs defaultValue="profile" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="organizations">Teams</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="tokens">Tokens</TabsTrigger>
      </TabsList>

      {/* Profile Tab */}
      <TabsContent value="profile">
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>Manage your account profile information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-10 w-10 text-primary" />
              </div>
              <div className="flex-1">
                <Button variant="outline" size="sm">
                  Upload Avatar
                </Button>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG or GIF, max 2MB</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button>Save Changes</Button>
              <Button variant="outline">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Organizations Tab */}
      <TabsContent value="organizations">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Organizations</CardTitle>
                <CardDescription>Manage your team memberships</CardDescription>
              </div>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Organization
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {organizations.map((org) => (
                <div key={org.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-8 w-8 text-primary" />
                    <div>
                      <h4 className="font-semibold">{org.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {org.members} members · {org.role}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Billing Tab */}
      <TabsContent value="billing" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Manage your payment information</CardDescription>
              </div>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Method
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div key={method.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {method.brand} •••• {method.last4}
                        </span>
                        {method.isDefault && <Badge variant="outline">Default</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">Expires {method.expiresAt}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!method.isDefault && (
                      <Button variant="outline" size="sm">
                        Set Default
                      </Button>
                    )}
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
            <CardDescription>Download your past invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{invoice.number}</p>
                      <p className="text-sm text-muted-foreground">{invoice.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium">${invoice.amount}</span>
                    <Badge variant={invoice.status === 'paid' ? 'success' : 'outline'}>{invoice.status}</Badge>
                    <Button variant="ghost" size="sm">
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Notifications Tab */}
      <TabsContent value="notifications">
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Configure how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Email Notifications</h4>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Deployment Success</p>
                    <p className="text-xs text-muted-foreground">Get notified when deployments succeed</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </label>
                <label className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Deployment Failure</p>
                    <p className="text-xs text-muted-foreground">Get notified when deployments fail</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </label>
                <label className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Resource Alerts</p>
                    <p className="text-xs text-muted-foreground">Alerts about resource usage</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </label>
                <label className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Billing Updates</p>
                    <p className="text-xs text-muted-foreground">Monthly billing and payment notifications</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </label>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium">Slack Integration</h4>
              <div className="space-y-2">
                <Label htmlFor="slackWebhook">Slack Webhook URL</Label>
                <Input id="slackWebhook" placeholder="https://hooks.slack.com/services/..." />
                <p className="text-xs text-muted-foreground">
                  Receive notifications in your Slack workspace
                </p>
              </div>
            </div>

            <Button>Save Preferences</Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Security Tab */}
      <TabsContent value="security" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Two-Factor Authentication</CardTitle>
            <CardDescription>Add an extra layer of security to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className={`h-5 w-5 ${twoFactorEnabled ? 'text-green-600' : 'text-muted-foreground'}`} />
                <div>
                  <p className="font-medium">
                    2FA is {twoFactorEnabled ? 'enabled' : 'disabled'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {twoFactorEnabled
                      ? 'Your account is protected with 2FA'
                      : 'Enable 2FA for better security'}
                  </p>
                </div>
              </div>
              <Button
                variant={twoFactorEnabled ? 'outline' : 'default'}
                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
              >
                {twoFactorEnabled ? 'Disable' : 'Enable'} 2FA
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>SSH Keys</CardTitle>
                <CardDescription>Manage SSH keys for Git operations</CardDescription>
              </div>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add SSH Key
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sshKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <KeyIcon className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{key.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{key.fingerprint}</p>
                      <p className="text-xs text-muted-foreground mt-1">Last used: {key.lastUsed}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tokens Tab */}
      <TabsContent value="tokens">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Personal Access Tokens</CardTitle>
                <CardDescription>Tokens for CLI and API access</CardDescription>
              </div>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Generate Token
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tokens.map((token) => (
                <div key={token.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-start gap-3 flex-1">
                    <KeyIcon className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold">{token.name}</h4>
                      <code className="text-xs text-muted-foreground">{token.prefix}...</code>
                      <div className="flex gap-1 mt-2">
                        {token.scopes.map((scope) => (
                          <Badge key={scope} variant="outline" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Last used: {token.lastUsed}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Revoke
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
    </Tabs>
  );
}
