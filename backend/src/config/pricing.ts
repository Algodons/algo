/**
 * Pricing configuration for team billing
 * 
 * These values can be overridden via environment variables for production deployments
 */

export interface PricingConfig {
  computeCostPerHour: number;
  storageCostPerGb: number;
  bandwidthCostPerGb: number;
  currency: string;
}

/**
 * Get pricing configuration from environment or use defaults
 */
export function getPricingConfig(): PricingConfig {
  return {
    computeCostPerHour: parseFloat(process.env.COMPUTE_COST_PER_HOUR || '0.10'),
    storageCostPerGb: parseFloat(process.env.STORAGE_COST_PER_GB || '0.02'),
    bandwidthCostPerGb: parseFloat(process.env.BANDWIDTH_COST_PER_GB || '0.05'),
    currency: process.env.BILLING_CURRENCY || 'USD',
  };
}

/**
 * Calculate cost based on usage and pricing
 */
export function calculateCost(
  computeHours: number,
  storageGb: number,
  bandwidthGb: number,
  pricing?: PricingConfig
): number {
  const config = pricing || getPricingConfig();
  return (
    computeHours * config.computeCostPerHour +
    storageGb * config.storageCostPerGb +
    bandwidthGb * config.bandwidthCostPerGb
  );
}
