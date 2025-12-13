/**
 * ML Model Registry Service
 * 
 * Manages ML model registration, versioning, and inference.
 */

import { Pool } from 'pg';

export interface MLModel {
  id: string;
  name: string;
  description: string;
  type: 'classification' | 'regression' | 'nlp' | 'cv';
  version: string;
  input_schema: any;
  output_schema: any;
  active: boolean;
}

export interface PredictionRequest {
  modelId: string;
  userId: number;
  input: any;
  parameters?: any;
}

export interface PredictionResult {
  prediction: any;
  confidence?: number;
  execution_time_ms: number;
  metadata?: any;
}

export class ModelRegistry {
  private pool: Pool;
  private models: Map<string, MLModel>;

  constructor(pool: Pool) {
    this.pool = pool;
    this.models = new Map();
  }

  /**
   * Initialize registry and load models from database
   */
  async initialize(): Promise<void> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM ml_models WHERE active = true'
      );
      
      result.rows.forEach((model: MLModel) => {
        this.models.set(model.id, model);
      });

      console.log(`Loaded ${this.models.size} ML models`);
    } catch (error) {
      console.error('Failed to initialize model registry:', error);
      throw error;
    }
  }

  /**
   * Register a new model
   */
  async registerModel(model: Omit<MLModel, 'active'>): Promise<MLModel> {
    try {
      const result = await this.pool.query(
        `INSERT INTO ml_models (id, name, description, type, version, input_schema, output_schema, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
         RETURNING *`,
        [
          model.id,
          model.name,
          model.description,
          model.type,
          model.version,
          JSON.stringify(model.input_schema),
          JSON.stringify(model.output_schema),
        ]
      );

      const newModel = result.rows[0];
      this.models.set(newModel.id, newModel);
      
      return newModel;
    } catch (error) {
      console.error('Failed to register model:', error);
      throw error;
    }
  }

  /**
   * Get model by ID
   */
  getModel(modelId: string): MLModel | undefined {
    return this.models.get(modelId);
  }

  /**
   * List all active models
   */
  listModels(type?: string): MLModel[] {
    const models = Array.from(this.models.values());
    
    if (type) {
      return models.filter(model => model.type === type);
    }
    
    return models;
  }

  /**
   * Run prediction
   */
  async predict(request: PredictionRequest): Promise<PredictionResult> {
    const model = this.models.get(request.modelId);
    
    if (!model) {
      throw new Error(`Model not found: ${request.modelId}`);
    }

    const startTime = Date.now();

    try {
      // Record prediction
      const predictionRecord = await this.pool.query(
        `INSERT INTO ml_predictions (model_id, user_id, input, parameters, status, created_at)
         VALUES ($1, $2, $3, $4, 'running', NOW())
         RETURNING id`,
        [
          request.modelId,
          request.userId,
          JSON.stringify(request.input),
          JSON.stringify(request.parameters || {}),
        ]
      );

      const predictionId = predictionRecord.rows[0].id;

      // Execute model inference
      const result = await this.executeInference(model, request);

      // Update prediction record
      await this.pool.query(
        `UPDATE ml_predictions
         SET status = 'completed', output = $1, confidence = $2, execution_time_ms = $3, completed_at = NOW()
         WHERE id = $4`,
        [
          JSON.stringify(result.prediction),
          result.confidence || null,
          result.execution_time_ms,
          predictionId,
        ]
      );

      return result;
    } catch (error: any) {
      console.error('Prediction failed:', error);
      throw error;
    }
  }

  /**
   * Execute model inference
   */
  private async executeInference(
    model: MLModel,
    request: PredictionRequest
  ): Promise<PredictionResult> {
    // This is where model-specific inference logic would be implemented
    // For now, return a mock response based on model type
    
    const executionTime = Math.floor(Math.random() * 500) + 50;
    let prediction: any;
    let confidence: number | undefined;

    switch (model.type) {
      case 'classification':
        prediction = { class: 'positive', score: 0.89 };
        confidence = 0.89;
        break;
      case 'regression':
        prediction = { value: 42.5, range: [40, 45] };
        break;
      case 'nlp':
        prediction = { sentiment: 'positive', entities: [] };
        confidence = 0.92;
        break;
      case 'cv':
        prediction = { objects: [], labels: [] };
        confidence = 0.85;
        break;
    }

    return {
      prediction,
      confidence,
      execution_time_ms: executionTime,
      metadata: {
        model_version: model.version,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Deactivate a model
   */
  async deactivateModel(modelId: string): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE ml_models SET active = false, updated_at = NOW() WHERE id = $1',
        [modelId]
      );
      
      this.models.delete(modelId);
    } catch (error) {
      console.error('Failed to deactivate model:', error);
      throw error;
    }
  }

  /**
   * Get model statistics
   */
  async getModelStats(modelId: string): Promise<any> {
    try {
      const result = await this.pool.query(
        `SELECT 
          COUNT(*) as total_predictions,
          AVG(confidence) as avg_confidence,
          AVG(execution_time_ms) as avg_execution_time,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_predictions,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_predictions
         FROM ml_predictions
         WHERE model_id = $1`,
        [modelId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Failed to get model stats:', error);
      throw error;
    }
  }

  /**
   * Run A/B test comparison
   */
  async compareModels(modelIdA: string, modelIdB: string, input: any): Promise<any> {
    const [resultA, resultB] = await Promise.all([
      this.predict({ modelId: modelIdA, userId: 0, input }),
      this.predict({ modelId: modelIdB, userId: 0, input }),
    ]);

    return {
      model_a: {
        id: modelIdA,
        result: resultA,
      },
      model_b: {
        id: modelIdB,
        result: resultB,
      },
      comparison: {
        confidence_diff: (resultA.confidence || 0) - (resultB.confidence || 0),
        time_diff: resultA.execution_time_ms - resultB.execution_time_ms,
      },
    };
  }
}

export default ModelRegistry;
