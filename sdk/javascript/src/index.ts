import axios, { AxiosInstance, AxiosError } from 'axios';

export interface AlgoConfig {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface User {
  id: number;
  email: string;
  username: string;
  name?: string;
  created_at: string;
  updated_at?: string;
  last_login?: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  template?: string;
  visibility: 'public' | 'private';
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface Deployment {
  id: number;
  project_id: number;
  status: string;
  deployment_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Webhook {
  id: number;
  user_id: number;
  project_id?: number;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
}

export class AlgoSDK {
  private client: AxiosInstance;
  private config: Required<AlgoConfig>;

  constructor(config: AlgoConfig = {}) {
    this.config = {
      apiKey: config.apiKey || '',
      baseURL: config.baseURL || 'http://localhost:4000/api/v1',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
    });

    // Add retry logic
    this.client.interceptors.response.use(
      response => response,
      async error => {
        const config = error.config;
        if (!config || !config.retry) {
          config.retry = 0;
        }

        if (config.retry >= this.config.maxRetries) {
          return Promise.reject(error);
        }

        config.retry += 1;
        const delay = Math.pow(2, config.retry) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));

        return this.client(config);
      }
    );
  }

  // Users API
  users = {
    create: async (data: { email: string; username: string; password: string; name?: string }): Promise<User> => {
      const response = await this.client.post('/users', data);
      return response.data.data;
    },

    get: async (id: number): Promise<User> => {
      const response = await this.client.get(`/users/${id}`);
      return response.data.data;
    },

    update: async (id: number, data: Partial<User>): Promise<User> => {
      const response = await this.client.put(`/users/${id}`, data);
      return response.data.data;
    },

    delete: async (id: number): Promise<void> => {
      await this.client.delete(`/users/${id}`);
    },

    list: async (params?: PaginationParams & { search?: string }): Promise<{ users: User[]; pagination: any }> => {
      const response = await this.client.get('/users', { params });
      return { users: response.data.data, pagination: response.data.pagination };
    },
  };

  // Projects API
  projects = {
    create: async (data: { name: string; description?: string; template?: string; visibility?: string }): Promise<Project> => {
      const response = await this.client.post('/projects', data);
      return response.data.data;
    },

    get: async (id: number): Promise<Project> => {
      const response = await this.client.get(`/projects/${id}`);
      return response.data.data;
    },

    list: async (params?: PaginationParams & { search?: string }): Promise<{ projects: Project[]; pagination: any }> => {
      const response = await this.client.get('/projects', { params });
      return { projects: response.data.data, pagination: response.data.pagination };
    },

    delete: async (id: number): Promise<void> => {
      await this.client.delete(`/projects/${id}`);
    },

    deploy: async (id: number): Promise<Deployment> => {
      const response = await this.client.post(`/projects/${id}/deploy`);
      return response.data.data;
    },

    clone: async (id: number, name?: string): Promise<Project> => {
      const response = await this.client.post(`/projects/${id}/clone`, { name });
      return response.data.data;
    },
  };

  // Files API
  files = {
    read: async (path: string, projectId: string): Promise<any> => {
      const response = await this.client.get(`/files/${path}`, { params: { projectId } });
      return response.data.data;
    },

    create: async (path: string, projectId: string, content: string, directory?: boolean): Promise<any> => {
      const response = await this.client.post(`/files/${path}`, { projectId, content, directory });
      return response.data.data;
    },

    update: async (path: string, projectId: string, content: string): Promise<any> => {
      const response = await this.client.put(`/files/${path}`, { projectId, content });
      return response.data.data;
    },

    delete: async (path: string, projectId: string): Promise<void> => {
      await this.client.delete(`/files/${path}`, { params: { projectId } });
    },
  };

  // Deployments API
  deployments = {
    get: async (id: number): Promise<Deployment> => {
      const response = await this.client.get(`/deployments/${id}`);
      return response.data.data;
    },

    rollback: async (id: number): Promise<Deployment> => {
      const response = await this.client.post(`/deployments/${id}/rollback`);
      return response.data.data;
    },
  };

  // Webhooks API
  webhooks = {
    create: async (data: { url: string; events: string[]; project_id?: number; secret?: string }): Promise<Webhook> => {
      const response = await this.client.post('/webhooks', data);
      return response.data.data;
    },

    get: async (id: number): Promise<Webhook> => {
      const response = await this.client.get(`/webhooks/${id}`);
      return response.data.data;
    },

    list: async (params?: PaginationParams & { project_id?: number }): Promise<{ webhooks: Webhook[]; pagination: any }> => {
      const response = await this.client.get('/webhooks', { params });
      return { webhooks: response.data.data, pagination: response.data.pagination };
    },

    update: async (id: number, data: Partial<Webhook>): Promise<Webhook> => {
      const response = await this.client.put(`/webhooks/${id}`, data);
      return response.data.data;
    },

    delete: async (id: number): Promise<void> => {
      await this.client.delete(`/webhooks/${id}`);
    },

    deliveries: async (id: number, params?: PaginationParams): Promise<{ deliveries: any[]; pagination: any }> => {
      const response = await this.client.get(`/webhooks/${id}/deliveries`, { params });
      return { deliveries: response.data.data, pagination: response.data.pagination };
    },
  };

  // Resources API
  resources = {
    usage: async (params?: { project_id?: number; start_date?: string; end_date?: string; metric?: string }): Promise<any> => {
      const response = await this.client.get('/resources/usage', { params });
      return response.data.data;
    },

    limits: async (): Promise<any> => {
      const response = await this.client.get('/resources/limits');
      return response.data.data;
    },
  };

  // Billing API
  billing = {
    get: async (params?: { start_date?: string; end_date?: string }): Promise<any> => {
      const response = await this.client.get('/billing', { params });
      return response.data.data;
    },
  };

  // AI API
  ai = {
    agents: {
      list: async (params?: PaginationParams & { category?: string }): Promise<{ agents: any[]; pagination: any }> => {
        const response = await this.client.get('/ai/agents', { params });
        return { agents: response.data.data, pagination: response.data.pagination };
      },

      invoke: async (agentId: string, input: any, context?: any, parameters?: any): Promise<any> => {
        const response = await this.client.post(`/ai/agents/${agentId}/invoke`, { input, context, parameters });
        return response.data.data;
      },
    },

    models: {
      list: async (params?: PaginationParams & { type?: string }): Promise<{ models: any[]; pagination: any }> => {
        const response = await this.client.get('/ai/models', { params });
        return { models: response.data.data, pagination: response.data.pagination };
      },

      predict: async (modelId: string, input: any, parameters?: any): Promise<any> => {
        const response = await this.client.post(`/ai/models/${modelId}/predict`, { input, parameters });
        return response.data.data;
      },
    },
  };
}

export default AlgoSDK;
