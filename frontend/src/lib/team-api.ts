import axios from 'axios';
import {
  Organization,
  OrganizationMember,
  CreateOrganizationRequest,
  InviteMemberRequest,
  TeamActivityLog,
  UserPresence,
  CodeComment,
  PullRequest,
  CreatePullRequestRequest,
  PullRequestReview,
  TeamBilling,
  MemberUsage,
  ProjectPermissions,
} from './types/collaboration';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Create axios instance with auth
const createAuthClient = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return axios.create({
    baseURL: API_BASE_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

// Organization APIs
export const organizationApi = {
  create: async (data: CreateOrganizationRequest): Promise<Organization> => {
    const client = createAuthClient();
    const response = await client.post('/api/teams', data);
    return response.data.organization;
  },

  list: async (): Promise<Organization[]> => {
    const client = createAuthClient();
    const response = await client.get('/api/teams');
    return response.data.organizations;
  },

  get: async (organizationId: number): Promise<Organization> => {
    const client = createAuthClient();
    const response = await client.get(`/api/teams/${organizationId}`);
    return response.data.organization;
  },

  update: async (organizationId: number, data: Partial<Organization>): Promise<Organization> => {
    const client = createAuthClient();
    const response = await client.patch(`/api/teams/${organizationId}`, data);
    return response.data.organization;
  },

  delete: async (organizationId: number): Promise<void> => {
    const client = createAuthClient();
    await client.delete(`/api/teams/${organizationId}`);
  },
};

// Member APIs
export const memberApi = {
  invite: async (organizationId: number, data: InviteMemberRequest): Promise<OrganizationMember> => {
    const client = createAuthClient();
    const response = await client.post(`/api/teams/${organizationId}/members`, data);
    return response.data.member;
  },

  list: async (organizationId: number): Promise<OrganizationMember[]> => {
    const client = createAuthClient();
    const response = await client.get(`/api/teams/${organizationId}/members`);
    return response.data.members;
  },

  updateRole: async (organizationId: number, userId: number, role: string): Promise<void> => {
    const client = createAuthClient();
    await client.patch(`/api/teams/${organizationId}/members/${userId}/role`, { role });
  },

  remove: async (organizationId: number, userId: number): Promise<void> => {
    const client = createAuthClient();
    await client.delete(`/api/teams/${organizationId}/members/${userId}`);
  },
};

// Activity APIs
export const activityApi = {
  list: async (organizationId: number, limit = 50): Promise<TeamActivityLog[]> => {
    const client = createAuthClient();
    const response = await client.get(`/api/teams/${organizationId}/activity`, {
      params: { limit },
    });
    return response.data.activities;
  },
};

// Presence APIs
export const presenceApi = {
  getActiveUsers: async (projectId: number): Promise<UserPresence[]> => {
    const client = createAuthClient();
    const response = await client.get(`/api/collaboration/projects/${projectId}/users`);
    return response.data.users;
  },
};

// Comments APIs
export const commentsApi = {
  create: async (projectId: number, data: {
    filePath: string;
    lineNumber: number;
    content: string;
  }): Promise<CodeComment> => {
    const client = createAuthClient();
    const response = await client.post(`/api/collaboration/projects/${projectId}/comments`, data);
    return response.data.comment;
  },

  list: async (projectId: number, filePath?: string): Promise<CodeComment[]> => {
    const client = createAuthClient();
    const response = await client.get(`/api/collaboration/projects/${projectId}/comments`, {
      params: filePath ? { filePath } : {},
    });
    return response.data.comments;
  },

  resolve: async (commentId: number): Promise<void> => {
    const client = createAuthClient();
    await client.post(`/api/collaboration/comments/${commentId}/resolve`);
  },
};

// Pull Request APIs
export const pullRequestApi = {
  create: async (projectId: number, data: CreatePullRequestRequest): Promise<PullRequest> => {
    const client = createAuthClient();
    const response = await client.post(`/api/version-control/projects/${projectId}/pull-requests`, data);
    return response.data.pullRequest;
  },

  list: async (projectId: number, status?: string): Promise<PullRequest[]> => {
    const client = createAuthClient();
    const response = await client.get(`/api/version-control/projects/${projectId}/pull-requests`, {
      params: status ? { status } : {},
    });
    return response.data.pullRequests;
  },

  get: async (projectId: number, prNumber: number): Promise<PullRequest> => {
    const client = createAuthClient();
    const response = await client.get(`/api/version-control/projects/${projectId}/pull-requests/${prNumber}`);
    return response.data.pullRequest;
  },

  merge: async (pullRequestId: number): Promise<void> => {
    const client = createAuthClient();
    await client.post(`/api/version-control/pull-requests/${pullRequestId}/merge`);
  },

  close: async (pullRequestId: number): Promise<void> => {
    const client = createAuthClient();
    await client.post(`/api/version-control/pull-requests/${pullRequestId}/close`);
  },
};

// Review APIs
export const reviewApi = {
  submit: async (pullRequestId: number, data: {
    status: string;
    comment?: string;
  }): Promise<PullRequestReview> => {
    const client = createAuthClient();
    const response = await client.post(`/api/version-control/pull-requests/${pullRequestId}/reviews`, data);
    return response.data.review;
  },

  list: async (pullRequestId: number): Promise<PullRequestReview[]> => {
    const client = createAuthClient();
    const response = await client.get(`/api/version-control/pull-requests/${pullRequestId}/reviews`);
    return response.data.reviews;
  },
};

// Billing APIs
export const billingApi = {
  getCurrent: async (organizationId: number): Promise<TeamBilling> => {
    const client = createAuthClient();
    const response = await client.get(`/api/team-billing/${organizationId}/current`);
    return response.data.billing;
  },

  getHistory: async (organizationId: number): Promise<TeamBilling[]> => {
    const client = createAuthClient();
    const response = await client.get(`/api/team-billing/${organizationId}/history`);
    return response.data.billingRecords;
  },

  getMemberUsage: async (organizationId: number): Promise<MemberUsage[]> => {
    const client = createAuthClient();
    const response = await client.get(`/api/team-billing/${organizationId}/usage/by-member`);
    return response.data.usage;
  },
};

// Permissions APIs
export const permissionsApi = {
  set: async (projectId: number, data: {
    userId?: number;
    organizationId?: number;
    permissions: {
      read: boolean;
      write: boolean;
      deploy: boolean;
      admin: boolean;
    };
  }): Promise<ProjectPermissions> => {
    const client = createAuthClient();
    const response = await client.post(`/api/teams/projects/${projectId}/permissions`, data);
    return response.data.permissions;
  },

  list: async (projectId: number): Promise<ProjectPermissions[]> => {
    const client = createAuthClient();
    const response = await client.get(`/api/teams/projects/${projectId}/permissions`);
    return response.data.permissions;
  },
};
