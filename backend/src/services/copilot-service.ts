/**
 * Copilot SaaS Integration Service
 * Handles communication with Copilot API endpoints
 */

import axios, { AxiosInstance } from 'axios';
import { getEnvironmentConfig } from '../config/environment';

export interface CopilotRequest {
  prompt: string;
  context?: any;
  parameters?: any;
}

export interface CopilotResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    tokens_used?: number;
    model?: string;
    latency_ms?: number;
  };
}

export class CopilotService {
  private static readonly SERVICE_DISABLED_ERROR = 'Copilot service is not enabled';
  
  private client: AxiosInstance;
  private enabled: boolean;
  private config: ReturnType<typeof getEnvironmentConfig>['copilot'];

  constructor() {
    const envConfig = getEnvironmentConfig();
    this.config = envConfig.copilot;
    this.enabled = this.config.enabled;

    // Initialize Axios client for Copilot API
    this.client = axios.create({
      baseURL: this.config.apiUrl,
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });

    // Add request interceptor for logging in dev
    if (envConfig.isDevelopment && envConfig.logging.verbose) {
      this.client.interceptors.request.use((config) => {
        console.log(`🤖 Copilot API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      });

      this.client.interceptors.response.use(
        (response) => {
          console.log(`✅ Copilot API Response: ${response.status}`);
          return response;
        },
        (error) => {
          console.error(`❌ Copilot API Error: ${error.message}`);
          return Promise.reject(error);
        }
      );
    }
  }

  /**
   * Check if Copilot service is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Send a completion request to Copilot
   */
  async complete(request: CopilotRequest): Promise<CopilotResponse> {
    if (!this.enabled) {
      return {
        success: false,
        error: CopilotService.SERVICE_DISABLED_ERROR,
      };
    }

    try {
      const startTime = Date.now();
      
      const response = await this.client.post('/v1/completions', {
        prompt: request.prompt,
        context: request.context || {},
        parameters: request.parameters || {},
      });

      const latency = Date.now() - startTime;

      return {
        success: true,
        data: response.data,
        metadata: {
          latency_ms: latency,
          tokens_used: response.data.tokens_used,
          model: response.data.model,
        },
      };
    } catch (error: any) {
      console.error('Copilot completion error:', error);
      // Sanitize error message to avoid exposing internal details
      const errorMessage = error.response?.status === 401 
        ? 'Authentication failed' 
        : error.response?.status === 429
        ? 'Rate limit exceeded'
        : 'Service temporarily unavailable';
      return {
        success: false,
        error: errorMessage,
        metadata: {
          latency_ms: 0,
        },
      };
    }
  }

  /**
   * Generate code using Copilot
   */
  async generateCode(prompt: string, language: string, context?: any): Promise<CopilotResponse> {
    if (!this.enabled) {
      return {
        success: false,
        error: CopilotService.SERVICE_DISABLED_ERROR,
      };
    }

    try {
      const startTime = Date.now();
      
      const response = await this.client.post('/v1/code/generate', {
        prompt,
        language,
        context: context || {},
      });

      const latency = Date.now() - startTime;

      return {
        success: true,
        data: response.data,
        metadata: {
          latency_ms: latency,
          tokens_used: response.data.tokens_used,
          model: response.data.model,
        },
      };
    } catch (error: any) {
      console.error('Copilot code generation error:', error);
      // Sanitize error message
      const errorMessage = error.response?.status === 401 
        ? 'Authentication failed' 
        : error.response?.status === 429
        ? 'Rate limit exceeded'
        : 'Service temporarily unavailable';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Explain code using Copilot
   */
  async explainCode(code: string, language: string): Promise<CopilotResponse> {
    if (!this.enabled) {
      return {
        success: false,
        error: CopilotService.SERVICE_DISABLED_ERROR,
      };
    }

    try {
      const response = await this.client.post('/v1/code/explain', {
        code,
        language,
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Copilot code explanation error:', error);
      // Sanitize error message
      const errorMessage = error.response?.status === 401 
        ? 'Authentication failed' 
        : error.response?.status === 429
        ? 'Rate limit exceeded'
        : 'Service temporarily unavailable';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get suggestions for code completion
   */
  async getSuggestions(code: string, cursorPosition: number, language: string): Promise<CopilotResponse> {
    if (!this.enabled) {
      return {
        success: false,
        error: CopilotService.SERVICE_DISABLED_ERROR,
      };
    }

    try {
      const response = await this.client.post('/v1/suggestions', {
        code,
        cursor_position: cursorPosition,
        language,
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Copilot suggestions error:', error);
      // Sanitize error message
      const errorMessage = error.response?.status === 401 
        ? 'Authentication failed' 
        : error.response?.status === 429
        ? 'Rate limit exceeded'
        : 'Service temporarily unavailable';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Health check for Copilot service
   */
  async healthCheck(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('Copilot health check failed:', error);
      return false;
    }
  }

  /**
   * Get Copilot service status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      apiUrl: this.config.apiUrl,
      hasApiKey: !!this.config.apiKey,
    };
  }
}

// Singleton instance
let copilotServiceInstance: CopilotService | null = null;

export function getCopilotService(): CopilotService {
  if (!copilotServiceInstance) {
    copilotServiceInstance = new CopilotService();
  }
  return copilotServiceInstance;
}

export default getCopilotService;
