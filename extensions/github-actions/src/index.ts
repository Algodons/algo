import * as core from '@actions/core';
import axios from 'axios';

async function run(): Promise<void> {
  try {
    // Get inputs
    const apiKey = core.getInput('api-key', { required: true });
    const projectId = core.getInput('project-id', { required: true });
    const apiUrl = core.getInput('api-url');
    const waitForDeployment = core.getInput('wait-for-deployment') === 'true';
    const deploymentTimeout = parseInt(core.getInput('deployment-timeout'));

    core.info(`Deploying project ${projectId} to Algo Platform...`);

    // Create axios client
    const client = axios.create({
      baseURL: apiUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // Initiate deployment
    const deployResponse = await client.post(`/projects/${projectId}/deploy`);
    const deployment = deployResponse.data.data;

    core.info(`Deployment initiated with ID: ${deployment.id}`);
    core.setOutput('deployment-id', deployment.id);

    if (waitForDeployment) {
      core.info('Waiting for deployment to complete...');
      
      const startTime = Date.now();
      let status = deployment.status;
      
      while (status === 'pending' || status === 'building' || status === 'deploying') {
        // Check timeout
        if (Date.now() - startTime > deploymentTimeout * 1000) {
          throw new Error('Deployment timeout exceeded');
        }

        // Wait 5 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Check deployment status
        const statusResponse = await client.get(`/deployments/${deployment.id}`);
        status = statusResponse.data.data.status;
        
        core.info(`Deployment status: ${status}`);

        if (status === 'active') {
          const deploymentUrl = statusResponse.data.data.deployment_url;
          core.info(`Deployment completed successfully!`);
          core.info(`Deployment URL: ${deploymentUrl}`);
          core.setOutput('deployment-url', deploymentUrl);
          core.setOutput('deployment-status', status);
          break;
        } else if (status === 'failed') {
          throw new Error('Deployment failed');
        }
      }
    } else {
      core.setOutput('deployment-status', deployment.status);
    }

    core.info('Deployment action completed!');
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
