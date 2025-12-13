/**
 * AI Agent Registry Service
 * 
 * Manages AI agent lifecycle, registration, and invocation.
 */

import { Pool } from 'pg';

export interface AIAgent {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  capabilities: any;
  parameters_schema: any;
  active: boolean;
}

export interface AgentInvocation {
  agentId: string;
  userId: number;
  input: any;
  context?: any;
  parameters?: any;
}

export interface AgentResponse {
  output: any;
  tokens_used: number;
  execution_time_ms: number;
  metadata?: any;
}

export class AgentRegistry {
  private pool: Pool;
  private agents: Map<string, AIAgent>;

  constructor(pool: Pool) {
    this.pool = pool;
    this.agents = new Map();
  }

  /**
   * Initialize registry and load agents from database
   */
  async initialize(): Promise<void> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM ai_agents WHERE active = true'
      );
      
      result.rows.forEach((agent: AIAgent) => {
        this.agents.set(agent.id, agent);
      });

      console.log(`Loaded ${this.agents.size} AI agents`);
    } catch (error) {
      console.error('Failed to initialize agent registry:', error);
      throw error;
    }
  }

  /**
   * Register a new agent
   */
  async registerAgent(agent: Omit<AIAgent, 'active'>): Promise<AIAgent> {
    try {
      const result = await this.pool.query(
        `INSERT INTO ai_agents (id, name, description, category, version, capabilities, parameters_schema, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
         RETURNING *`,
        [
          agent.id,
          agent.name,
          agent.description,
          agent.category,
          agent.version,
          JSON.stringify(agent.capabilities),
          JSON.stringify(agent.parameters_schema),
        ]
      );

      const newAgent = result.rows[0];
      this.agents.set(newAgent.id, newAgent);
      
      return newAgent;
    } catch (error) {
      console.error('Failed to register agent:', error);
      throw error;
    }
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AIAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * List all active agents
   */
  listAgents(category?: string): AIAgent[] {
    const agents = Array.from(this.agents.values());
    
    if (category) {
      return agents.filter(agent => agent.category === category);
    }
    
    return agents;
  }

  /**
   * Invoke an agent
   */
  async invokeAgent(invocation: AgentInvocation): Promise<AgentResponse> {
    const agent = this.agents.get(invocation.agentId);
    
    if (!agent) {
      throw new Error(`Agent not found: ${invocation.agentId}`);
    }

    const startTime = Date.now();

    try {
      // Record invocation
      const invocationRecord = await this.pool.query(
        `INSERT INTO ai_agent_invocations (agent_id, user_id, input, context, parameters, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'running', NOW())
         RETURNING id`,
        [
          invocation.agentId,
          invocation.userId,
          JSON.stringify(invocation.input),
          JSON.stringify(invocation.context || {}),
          JSON.stringify(invocation.parameters || {}),
        ]
      );

      const invocationId = invocationRecord.rows[0].id;

      // Execute agent logic
      const response = await this.executeAgent(agent, invocation);

      // Update invocation record
      await this.pool.query(
        `UPDATE ai_agent_invocations
         SET status = 'completed', output = $1, tokens_used = $2, execution_time_ms = $3, completed_at = NOW()
         WHERE id = $4`,
        [
          JSON.stringify(response.output),
          response.tokens_used,
          response.execution_time_ms,
          invocationId,
        ]
      );

      return response;
    } catch (error: any) {
      console.error('Agent invocation failed:', error);
      throw error;
    }
  }

  /**
   * Execute agent-specific logic
   * 
   * STUB: This is a mock implementation. In production, this would:
   * - Route to the appropriate agent implementation
   * - Call external AI services (OpenAI, Anthropic, etc.)
   * - Execute custom agent logic
   * - Handle context and parameters appropriately
   * 
   * Current implementation returns mock data for testing and development.
   */
  private async executeAgent(
    agent: AIAgent,
    invocation: AgentInvocation
  ): Promise<AgentResponse> {
    // STUB: Mock implementation - replace with actual agent logic
    // This serves as a template for the agent execution interface
    
    const executionTime = Math.floor(Math.random() * 1000) + 100;
    
    return {
      output: {
        message: `Agent ${agent.name} processed your request`,
        result: 'Sample output',
      },
      tokens_used: Math.floor(Math.random() * 500) + 50,
      execution_time_ms: executionTime,
      metadata: {
        agent_version: agent.version,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Deactivate an agent
   */
  async deactivateAgent(agentId: string): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE ai_agents SET active = false, updated_at = NOW() WHERE id = $1',
        [agentId]
      );
      
      this.agents.delete(agentId);
    } catch (error) {
      console.error('Failed to deactivate agent:', error);
      throw error;
    }
  }

  /**
   * Get agent statistics
   */
  async getAgentStats(agentId: string): Promise<any> {
    try {
      const result = await this.pool.query(
        `SELECT 
          COUNT(*) as total_invocations,
          AVG(tokens_used) as avg_tokens,
          AVG(execution_time_ms) as avg_execution_time,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_invocations,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_invocations
         FROM ai_agent_invocations
         WHERE agent_id = $1`,
        [agentId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Failed to get agent stats:', error);
      throw error;
    }
  }
}

export default AgentRegistry;
