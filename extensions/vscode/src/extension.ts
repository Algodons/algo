import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';

let algoClient: AxiosInstance;

export function activate(context: vscode.ExtensionContext) {
  console.log('Algo extension is now active!');

  // Get configuration
  const config = vscode.workspace.getConfiguration('algo');
  const apiKey = config.get<string>('apiKey');
  const apiUrl = config.get<string>('apiUrl') || 'https://api.algo.dev/v1';

  // Initialize API client
  algoClient = axios.create({
    baseURL: apiUrl,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  // Register commands
  
  // Deploy command
  const deployCommand = vscode.commands.registerCommand('algo.deploy', async () => {
    const projectId = config.get<string>('projectId');
    
    if (!projectId) {
      vscode.window.showErrorMessage('Please configure your project ID in settings');
      return;
    }

    if (!apiKey) {
      vscode.window.showErrorMessage('Please configure your API key in settings');
      return;
    }

    vscode.window.showInformationMessage('Deploying project...');

    try {
      const response = await algoClient.post(`/projects/${projectId}/deploy`);
      const deployment = response.data.data;
      
      vscode.window.showInformationMessage(
        `Deployment initiated! ID: ${deployment.id}`,
        'View Status'
      ).then(selection => {
        if (selection === 'View Status') {
          vscode.commands.executeCommand('algo.viewDeployment', deployment.id);
        }
      });
    } catch (error: any) {
      vscode.window.showErrorMessage(`Deployment failed: ${error.message}`);
    }
  });

  // Sync files command
  const syncFilesCommand = vscode.commands.registerCommand('algo.syncFiles', async () => {
    vscode.window.showInformationMessage('File sync not yet implemented');
  });

  // View resources command
  const viewResourcesCommand = vscode.commands.registerCommand('algo.viewResources', async () => {
    if (!apiKey) {
      vscode.window.showErrorMessage('Please configure your API key in settings');
      return;
    }

    try {
      const response = await algoClient.get('/resources/usage');
      const usage = response.data.data;
      
      // Create webview to display resources
      const panel = vscode.window.createWebviewPanel(
        'algoResources',
        'Algo Resources',
        vscode.ViewColumn.One,
        {}
      );

      panel.webview.html = getResourceWebviewContent(usage);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to fetch resources: ${error.message}`);
    }
  });

  // Invoke AI agent command
  const invokeAgentCommand = vscode.commands.registerCommand('algo.invokeAgent', async () => {
    if (!apiKey) {
      vscode.window.showErrorMessage('Please configure your API key in settings');
      return;
    }

    // Get list of agents
    try {
      const response = await algoClient.get('/ai/agents');
      const agents = response.data.data;

      // Show quick pick
      const selectedAgent = await vscode.window.showQuickPick(
        agents.map((agent: any) => ({
          label: agent.name,
          description: agent.description,
          id: agent.id,
        })),
        { placeHolder: 'Select an AI agent' }
      );

      if (selectedAgent) {
        // Get input from user
        const input = await vscode.window.showInputBox({
          prompt: 'Enter input for the AI agent',
          placeHolder: 'Your input...',
        });

        if (input) {
          vscode.window.showInformationMessage('Invoking AI agent...');
          
          const invokeResponse = await algoClient.post(
            `/ai/agents/${selectedAgent.id}/invoke`,
            { input }
          );
          
          const result = invokeResponse.data.data;
          vscode.window.showInformationMessage(
            `Agent output: ${JSON.stringify(result.output)}`
          );
        }
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to invoke agent: ${error.message}`);
    }
  });

  context.subscriptions.push(
    deployCommand,
    syncFilesCommand,
    viewResourcesCommand,
    invokeAgentCommand
  );
}

function getResourceWebviewContent(usage: any): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Algo Resources</title>
      <style>
        body {
          font-family: var(--vscode-font-family);
          padding: 20px;
        }
        .metric {
          margin-bottom: 20px;
          padding: 15px;
          border: 1px solid var(--vscode-panel-border);
          border-radius: 4px;
        }
        .metric h3 {
          margin-top: 0;
          color: var(--vscode-foreground);
        }
        .metric-value {
          font-size: 24px;
          font-weight: bold;
          color: var(--vscode-textLink-foreground);
        }
      </style>
    </head>
    <body>
      <h1>Resource Usage</h1>
      <div id="metrics">
        ${Object.entries(usage.aggregates || {}).map(([metric, data]: [string, any]) => `
          <div class="metric">
            <h3>${metric.toUpperCase()}</h3>
            <p>Average: <span class="metric-value">${data.average.toFixed(2)} ${data.unit}</span></p>
            <p>Peak: <span class="metric-value">${data.peak.toFixed(2)} ${data.unit}</span></p>
            <p>Total: <span class="metric-value">${data.total.toFixed(2)} ${data.unit}</span></p>
          </div>
        `).join('')}
      </div>
    </body>
    </html>
  `;
}

export function deactivate() {}
