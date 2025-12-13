# Algo Platform SDKs

Official SDKs for the Algo Cloud IDE Platform.

## Available SDKs

- **JavaScript/TypeScript** - Full-featured SDK with TypeScript support
- **Python** - Pythonic SDK with async/await support
- **CLI** - Command-line tool for terminal operations

## JavaScript/TypeScript SDK

### Installation

```bash
npm install @algo/sdk
```

### Quick Start

```typescript
import { AlgoSDK } from '@algo/sdk';

const algo = new AlgoSDK({
  apiKey: 'your-api-key',
  baseURL: 'https://api.algo.dev/v1'
});

// Create a project
const project = await algo.projects.create({
  name: 'My Project',
  description: 'A cool project'
});

// Deploy
const deployment = await algo.projects.deploy(project.id);
console.log('Deployment URL:', deployment.deployment_url);
```

### Features

- ✅ Full API coverage
- ✅ TypeScript type definitions
- ✅ Automatic retry with exponential backoff
- ✅ Promise-based async operations
- ✅ Error handling with custom error types
- ✅ Pagination support

### API Reference

```typescript
// Users
algo.users.create(data)
algo.users.get(id)
algo.users.update(id, data)
algo.users.delete(id)
algo.users.list(params)

// Projects
algo.projects.create(data)
algo.projects.get(id)
algo.projects.list(params)
algo.projects.deploy(id)
algo.projects.clone(id, name)
algo.projects.delete(id)

// Files
algo.files.read(path, projectId)
algo.files.create(path, projectId, content, directory)
algo.files.update(path, projectId, content)
algo.files.delete(path, projectId)

// Deployments
algo.deployments.get(id)
algo.deployments.rollback(id)

// Webhooks
algo.webhooks.create(data)
algo.webhooks.get(id)
algo.webhooks.list(params)
algo.webhooks.update(id, data)
algo.webhooks.delete(id)
algo.webhooks.deliveries(id, params)

// Resources
algo.resources.usage(params)
algo.resources.limits()

// Billing
algo.billing.get(params)

// AI
algo.ai.agents.list(params)
algo.ai.agents.invoke(agentId, input, context, parameters)
algo.ai.models.list(params)
algo.ai.models.predict(modelId, input, parameters)
```

## Python SDK

### Installation

```bash
pip install algo-sdk
```

### Quick Start

```python
from algo_sdk import AlgoSDK

algo = AlgoSDK(api_key='your-api-key')

# Create a project
project = algo.projects.create(
    name='My Project',
    description='A cool project'
)

# Deploy
deployment = algo.projects.deploy(project.id)
print(f"Deployment URL: {deployment.deployment_url}")
```

### Features

- ✅ Pythonic API wrapper
- ✅ Type hints throughout
- ✅ Automatic retry logic
- ✅ Pydantic models for validation
- ✅ Support for async/await
- ✅ Pagination support

### API Reference

```python
# Users
algo.users.create(email, username, password, name=None)
algo.users.get(user_id)
algo.users.update(user_id, **kwargs)
algo.users.delete(user_id)
algo.users.list(page=1, limit=20, search=None)

# Projects
algo.projects.create(name, description=None, **kwargs)
algo.projects.get(project_id)
algo.projects.list(page=1, limit=20, search=None)
algo.projects.deploy(project_id)
algo.projects.clone(project_id, name=None)
algo.projects.delete(project_id)

# Files
algo.files.read(path, project_id)
algo.files.create(path, project_id, content='', directory=False)
algo.files.update(path, project_id, content)
algo.files.delete(path, project_id)

# Webhooks
algo.webhooks.create(url, events, project_id=None, secret=None)
algo.webhooks.get(webhook_id)
algo.webhooks.list(page=1, limit=20, project_id=None)
algo.webhooks.update(webhook_id, **kwargs)
algo.webhooks.delete(webhook_id)

# AI
algo.ai.agents.list(page=1, limit=20, category=None)
algo.ai.agents.invoke(agent_id, input_data, context=None, parameters=None)
algo.ai.models.list(page=1, limit=20, model_type=None)
algo.ai.models.predict(model_id, input_data, parameters=None)
```

## CLI Tool

### Installation

```bash
npm install -g @algo/cli
```

### Configuration

```bash
# Set API key
export ALGO_API_KEY=your-api-key

# Or configure via command
algo config --api-key your-api-key --api-url https://api.algo.dev/v1
```

### Usage

```bash
# Projects
algo projects list
algo projects create "My Project" --description "A cool project"
algo projects deploy 123

# Webhooks
algo webhooks list
algo webhooks create https://my-url.com/webhook --events deployment.completed build.failed

# AI
algo ai agents
algo ai invoke code-assistant --input '{"prompt": "Generate a function"}'
algo ai models --type nlp

# Resources
algo resources usage --metric cpu
algo resources limits
```

### Features

- ✅ Terminal operations for all API endpoints
- ✅ Interactive mode (coming soon)
- ✅ Configuration management
- ✅ Multiple output formats (JSON, table, YAML)
- ✅ Command aliases
- ✅ Auto-completion (coming soon)

## Error Handling

### JavaScript/TypeScript

```typescript
import { AlgoSDK, AlgoAPIError } from '@algo/sdk';

try {
  const project = await algo.projects.get(123);
} catch (error) {
  if (error instanceof AlgoAPIError) {
    console.error('API Error:', error.message);
    console.error('Status:', error.statusCode);
    console.error('Details:', error.response);
  }
}
```

### Python

```python
from algo_sdk import AlgoSDK, AlgoAPIError, AlgoNotFoundError

try:
    project = algo.projects.get(123)
except AlgoNotFoundError as e:
    print(f"Project not found: {e.message}")
except AlgoAPIError as e:
    print(f"API Error: {e.message}")
    print(f"Status: {e.status_code}")
```

## Examples

### Complete Project Lifecycle

```typescript
// JavaScript
const algo = new AlgoSDK({ apiKey: 'key' });

// 1. Create project
const project = await algo.projects.create({
  name: 'My App',
  template: 'react'
});

// 2. Add files
await algo.files.create('README.md', project.id, '# My App');
await algo.files.create('src/index.js', project.id, 'console.log("Hello");');

// 3. Setup webhook
await algo.webhooks.create({
  url: 'https://my-domain.com/webhook',
  events: ['deployment.completed'],
  project_id: project.id
});

// 4. Deploy
const deployment = await algo.projects.deploy(project.id);

// 5. Monitor
let status = 'pending';
while (status === 'pending' || status === 'building') {
  await new Promise(r => setTimeout(r, 5000));
  const dep = await algo.deployments.get(deployment.id);
  status = dep.status;
  console.log('Status:', status);
}
```

```python
# Python
from algo_sdk import AlgoSDK
import time

algo = AlgoSDK(api_key='key')

# 1. Create project
project = algo.projects.create(name='My App', template='react')

# 2. Add files
algo.files.create('README.md', project.id, '# My App')
algo.files.create('src/index.js', project.id, 'console.log("Hello");')

# 3. Setup webhook
algo.webhooks.create(
    url='https://my-domain.com/webhook',
    events=['deployment.completed'],
    project_id=project.id
)

# 4. Deploy
deployment = algo.projects.deploy(project.id)

# 5. Monitor
status = 'pending'
while status in ['pending', 'building']:
    time.sleep(5)
    dep = algo.deployments.get(deployment.id)
    status = dep.status
    print(f'Status: {status}')
```

## Contributing

We welcome contributions to the SDKs! Please see the [CONTRIBUTING.md](../CONTRIBUTING.md) file for guidelines.

## License

MIT License - see [LICENSE](../LICENSE) file for details.

## Support

- Documentation: https://docs.algo.dev
- GitHub Issues: https://github.com/Algodons/algo/issues
- Email: support@algo.dev
