// Dashboard types and interfaces

export interface ApiKey {
  id: number;
  userId: number;
  name: string;
  keyHash: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface ApiKeyCreate {
  name: string;
  scopes: string[];
  expiresAt?: Date;
}

export interface Webhook {
  id: number;
  userId: number;
  projectId?: number;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  isActive: boolean;
  lastTriggeredAt?: Date;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiUsage {
  id: number;
  apiKeyId?: number;
  userId: number;
  endpoint: string;
  method: string;
  statusCode?: number;
  responseTimeMs?: number;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface ResourceMetric {
  id: number;
  userId: number;
  projectId?: number;
  metricType: 'cpu' | 'memory' | 'storage' | 'bandwidth' | 'build_minutes';
  value: number;
  unit: string;
  timestamp: Date;
}

export interface ResourceUsageSummary {
  cpu: {
    current: number;
    limit: number;
    percentage: number;
  };
  memory: {
    current: number;
    limit: number;
    percentage: number;
    unit: string;
  };
  storage: {
    current: number;
    limit: number;
    percentage: number;
    unit: string;
  };
  bandwidth: {
    current: number;
    limit: number;
    unit: string;
  };
}

export interface BillingPeriod {
  id: number;
  userId: number;
  periodStart: Date;
  periodEnd: Date;
  totalCost: number;
  cpuCost: number;
  memoryCost: number;
  storageCost: number;
  bandwidthCost: number;
  status: 'pending' | 'paid' | 'overdue';
  paidAt?: Date;
  createdAt: Date;
}

export interface ProjectFavorite {
  id: number;
  userId: number;
  projectId: number;
  createdAt: Date;
}

export interface ProjectCollaborator {
  id: number;
  projectId: number;
  userId: number;
  invitedBy?: number;
  role: 'viewer' | 'editor' | 'admin';
  status: 'pending' | 'accepted' | 'rejected';
  invitedAt: Date;
  acceptedAt?: Date;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
  ownerId: number;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: number;
  organizationId: number;
  userId: number;
  role: 'owner' | 'admin' | 'member';
  invitedAt: Date;
  joinedAt?: Date;
}

export interface PaymentMethod {
  id: number;
  userId: number;
  type: 'card' | 'bank_account' | 'paypal';
  provider: string;
  providerPaymentMethodId?: string;
  lastFour?: string;
  brand?: string;
  isDefault: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: number;
  userId: number;
  invoiceNumber: string;
  billingPeriodId?: number;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  pdfUrl?: string;
  issuedAt?: Date;
  dueAt?: Date;
  paidAt?: Date;
  createdAt: Date;
}

export interface NotificationPreferences {
  id: number;
  userId: number;
  emailNotifications: boolean;
  emailMarketing: boolean;
  emailDeploymentSuccess: boolean;
  emailDeploymentFailure: boolean;
  emailResourceAlerts: boolean;
  emailBillingUpdates: boolean;
  inAppNotifications: boolean;
  slackWebhookUrl?: string;
  slackNotifications: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TwoFactorAuth {
  id: number;
  userId: number;
  secret: string;
  backupCodes?: string[];
  isEnabled: boolean;
  enabledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SshKey {
  id: number;
  userId: number;
  name: string;
  publicKey: string;
  fingerprint: string;
  lastUsedAt?: Date;
  createdAt: Date;
}

export interface PersonalAccessToken {
  id: number;
  userId: number;
  name: string;
  tokenHash: string;
  tokenPrefix: string;
  scopes: string[];
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface ProjectTemplate {
  id: number;
  name: string;
  description?: string;
  language: string;
  framework?: string;
  category?: string;
  iconUrl?: string;
  repositoryUrl?: string;
  isOfficial: boolean;
  isActive: boolean;
  usageCount: number;
  createdBy?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceAlert {
  id: number;
  userId: number;
  metricType: string;
  thresholdValue: number;
  thresholdPercentage?: number;
  isActive: boolean;
  lastTriggeredAt?: Date;
  notificationSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookDelivery {
  id: number;
  webhookId: number;
  eventType: string;
  payload: any;
  responseStatus?: number;
  responseBody?: string;
  deliveredAt: Date;
  success: boolean;
}

export interface ProjectWithStats {
  id: number;
  name: string;
  description?: string;
  language: string;
  framework?: string;
  deploymentStatus: 'idle' | 'deploying' | 'running' | 'stopped' | 'failed';
  deploymentUrl?: string;
  buildCount: number;
  lastDeployedAt?: Date;
  lastAccessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  isFavorite?: boolean;
  resourceUsage?: {
    cpu: number;
    memory: number;
    storage: number;
  };
}

export interface ApiUsageAnalytics {
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  requestsByEndpoint: {
    endpoint: string;
    count: number;
    averageResponseTime: number;
  }[];
  requestsByStatus: {
    statusCode: number;
    count: number;
  }[];
  timeline: {
    date: string;
    count: number;
  }[];
}

export interface UsageForecast {
  metricType: string;
  currentValue: number;
  forecastedValue: number;
  forecastDate: Date;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}
