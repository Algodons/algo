#!/usr/bin/env node

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import { AlgoSDK } from '@algo/sdk';

dotenv.config();

const program = new Command();

program
  .name('algo')
  .description('Official CLI tool for Algo Cloud IDE Platform')
  .version('1.0.0');

// Initialize SDK
const sdk = new AlgoSDK({
  apiKey: process.env.ALGO_API_KEY,
  baseURL: process.env.ALGO_API_URL || 'http://localhost:4000/api/v1',
});

// Projects commands
const projectsCmd = program.command('projects').description('Manage projects');

projectsCmd
  .command('list')
  .description('List all projects')
  .option('-p, --page <number>', 'Page number', '1')
  .option('-l, --limit <number>', 'Results per page', '20')
  .option('-s, --search <query>', 'Search query')
  .action(async (options) => {
    try {
      const result = await sdk.projects.list({
        page: parseInt(options.page),
        limit: parseInt(options.limit),
        search: options.search,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

projectsCmd
  .command('create <name>')
  .description('Create a new project')
  .option('-d, --description <text>', 'Project description')
  .option('-t, --template <template>', 'Project template')
  .option('-v, --visibility <type>', 'Visibility (public/private)', 'private')
  .action(async (name, options) => {
    try {
      const project = await sdk.projects.create({
        name,
        description: options.description,
        template: options.template,
        visibility: options.visibility,
      });
      console.log('Project created successfully!');
      console.log(JSON.stringify(project, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

projectsCmd
  .command('deploy <id>')
  .description('Deploy a project')
  .action(async (id) => {
    try {
      const deployment = await sdk.projects.deploy(parseInt(id));
      console.log('Deployment initiated!');
      console.log(JSON.stringify(deployment, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

projectsCmd
  .command('delete <id>')
  .description('Delete a project')
  .action(async (id) => {
    try {
      await sdk.projects.delete(parseInt(id));
      console.log('Project deleted successfully!');
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Webhooks commands
const webhooksCmd = program.command('webhooks').description('Manage webhooks');

webhooksCmd
  .command('list')
  .description('List all webhooks')
  .option('-p, --page <number>', 'Page number', '1')
  .option('-l, --limit <number>', 'Results per page', '20')
  .option('--project-id <id>', 'Filter by project ID')
  .action(async (options) => {
    try {
      const result = await sdk.webhooks.list({
        page: parseInt(options.page),
        limit: parseInt(options.limit),
        project_id: options.projectId ? parseInt(options.projectId) : undefined,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

webhooksCmd
  .command('create <url>')
  .description('Create a new webhook')
  .requiredOption('-e, --events <events...>', 'Event types to subscribe to')
  .option('--project-id <id>', 'Project ID')
  .option('--secret <secret>', 'Webhook secret')
  .action(async (url, options) => {
    try {
      const webhook = await sdk.webhooks.create({
        url,
        events: options.events,
        project_id: options.projectId ? parseInt(options.projectId) : undefined,
        secret: options.secret,
      });
      console.log('Webhook created successfully!');
      console.log(JSON.stringify(webhook, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

webhooksCmd
  .command('delete <id>')
  .description('Delete a webhook')
  .action(async (id) => {
    try {
      await sdk.webhooks.delete(parseInt(id));
      console.log('Webhook deleted successfully!');
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// AI commands
const aiCmd = program.command('ai').description('AI agents and models');

aiCmd
  .command('agents')
  .description('List AI agents')
  .option('-c, --category <category>', 'Filter by category')
  .action(async (options) => {
    try {
      const result = await sdk.ai.agents.list({
        category: options.category,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

aiCmd
  .command('invoke <agentId>')
  .description('Invoke an AI agent')
  .requiredOption('-i, --input <data>', 'Input data (JSON string)')
  .option('-c, --context <data>', 'Context data (JSON string)')
  .option('-p, --parameters <data>', 'Parameters (JSON string)')
  .action(async (agentId, options) => {
    try {
      const input = JSON.parse(options.input);
      const context = options.context ? JSON.parse(options.context) : undefined;
      const parameters = options.parameters ? JSON.parse(options.parameters) : undefined;
      
      const result = await sdk.ai.agents.invoke(agentId, input, context, parameters);
      console.log('Agent invoked successfully!');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

aiCmd
  .command('models')
  .description('List ML models')
  .option('-t, --type <type>', 'Filter by type')
  .action(async (options) => {
    try {
      const result = await sdk.ai.models.list({
        type: options.type,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Resources commands
const resourcesCmd = program.command('resources').description('Resource management');

resourcesCmd
  .command('usage')
  .description('Get resource usage')
  .option('--project-id <id>', 'Project ID')
  .option('--metric <metric>', 'Metric type (cpu, memory, storage, bandwidth)')
  .action(async (options) => {
    try {
      const result = await sdk.resources.usage({
        project_id: options.projectId ? parseInt(options.projectId) : undefined,
        metric: options.metric,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

resourcesCmd
  .command('limits')
  .description('Get resource limits')
  .action(async () => {
    try {
      const result = await sdk.resources.limits();
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Configuration command
program
  .command('config')
  .description('Configure CLI settings')
  .option('--api-key <key>', 'Set API key')
  .option('--api-url <url>', 'Set API URL')
  .action((options) => {
    // In a real implementation, this would save to a config file
    console.log('Configuration:');
    if (options.apiKey) {
      console.log('API Key: Set');
    }
    if (options.apiUrl) {
      console.log('API URL:', options.apiUrl);
    }
  });

program.parse();
