"""Main client for Algo SDK."""

import time
from typing import Dict, List, Optional, Any
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .models import User, Project, Deployment, Webhook, AIAgent, MLModel
from .exceptions import (
    AlgoAPIError,
    AlgoAuthError,
    AlgoNotFoundError,
    AlgoValidationError,
    AlgoRateLimitError,
)


class AlgoSDK:
    """
    Main client for interacting with Algo Cloud IDE Platform API.
    
    Example:
        >>> from algo_sdk import AlgoSDK
        >>> client = AlgoSDK(api_key="your-api-key")
        >>> projects = client.projects.list()
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "http://localhost:4000/api/v1",
        timeout: int = 30,
        max_retries: int = 3,
    ):
        """
        Initialize Algo SDK client.
        
        Args:
            api_key: API key for authentication
            base_url: Base URL for the API
            timeout: Request timeout in seconds
            max_retries: Maximum number of retries for failed requests
        """
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

        # Setup session with retry logic
        self.session = requests.Session()
        retry_strategy = Retry(
            total=max_retries,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            method_whitelist=["HEAD", "GET", "OPTIONS", "POST", "PUT", "DELETE"],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

        # Set default headers
        self.session.headers.update({"Content-Type": "application/json"})
        if api_key:
            self.session.headers.update({"Authorization": f"Bearer {api_key}"})

        # Initialize resource APIs
        self.users = UsersAPI(self)
        self.projects = ProjectsAPI(self)
        self.files = FilesAPI(self)
        self.deployments = DeploymentsAPI(self)
        self.webhooks = WebhooksAPI(self)
        self.resources = ResourcesAPI(self)
        self.billing = BillingAPI(self)
        self.ai = AIAPI(self)

    def _request(self, method: str, endpoint: str, **kwargs) -> Any:
        """Make HTTP request with error handling."""
        url = f"{self.base_url}{endpoint}"
        
        try:
            response = self.session.request(
                method, url, timeout=self.timeout, **kwargs
            )
            
            if response.status_code == 401:
                raise AlgoAuthError("Authentication failed", response.status_code, response.json())
            elif response.status_code == 404:
                raise AlgoNotFoundError("Resource not found", response.status_code, response.json())
            elif response.status_code == 400:
                raise AlgoValidationError("Validation failed", response.status_code, response.json())
            elif response.status_code == 429:
                raise AlgoRateLimitError("Rate limit exceeded", response.status_code, response.json())
            elif response.status_code >= 400:
                raise AlgoAPIError(
                    f"API error: {response.status_code}",
                    response.status_code,
                    response.json() if response.content else None,
                )
            
            return response.json() if response.content else None
            
        except requests.exceptions.RequestException as e:
            raise AlgoAPIError(f"Request failed: {str(e)}")


class UsersAPI:
    """Users API endpoints."""

    def __init__(self, client: AlgoSDK):
        self.client = client

    def create(self, email: str, username: str, password: str, name: Optional[str] = None) -> User:
        """Create a new user."""
        data = {"email": email, "username": username, "password": password}
        if name:
            data["name"] = name
        response = self.client._request("POST", "/users", json=data)
        return User(**response["data"])

    def get(self, user_id: int) -> User:
        """Get user by ID."""
        response = self.client._request("GET", f"/users/{user_id}")
        return User(**response["data"])

    def update(self, user_id: int, **kwargs) -> User:
        """Update user."""
        response = self.client._request("PUT", f"/users/{user_id}", json=kwargs)
        return User(**response["data"])

    def delete(self, user_id: int) -> None:
        """Delete user."""
        self.client._request("DELETE", f"/users/{user_id}")

    def list(self, page: int = 1, limit: int = 20, search: Optional[str] = None) -> Dict[str, Any]:
        """List users with pagination."""
        params = {"page": page, "limit": limit}
        if search:
            params["search"] = search
        response = self.client._request("GET", "/users", params=params)
        return {
            "users": [User(**u) for u in response["data"]],
            "pagination": response["pagination"],
        }


class ProjectsAPI:
    """Projects API endpoints."""

    def __init__(self, client: AlgoSDK):
        self.client = client

    def create(self, name: str, description: Optional[str] = None, **kwargs) -> Project:
        """Create a new project."""
        data = {"name": name}
        if description:
            data["description"] = description
        data.update(kwargs)
        response = self.client._request("POST", "/projects", json=data)
        return Project(**response["data"])

    def get(self, project_id: int) -> Project:
        """Get project by ID."""
        response = self.client._request("GET", f"/projects/{project_id}")
        return Project(**response["data"])

    def list(self, page: int = 1, limit: int = 20, search: Optional[str] = None) -> Dict[str, Any]:
        """List projects with pagination."""
        params = {"page": page, "limit": limit}
        if search:
            params["search"] = search
        response = self.client._request("GET", "/projects", params=params)
        return {
            "projects": [Project(**p) for p in response["data"]],
            "pagination": response["pagination"],
        }

    def delete(self, project_id: int) -> None:
        """Delete project."""
        self.client._request("DELETE", f"/projects/{project_id}")

    def deploy(self, project_id: int) -> Deployment:
        """Deploy project."""
        response = self.client._request("POST", f"/projects/{project_id}/deploy")
        return Deployment(**response["data"])

    def clone(self, project_id: int, name: Optional[str] = None) -> Project:
        """Clone project."""
        data = {}
        if name:
            data["name"] = name
        response = self.client._request("POST", f"/projects/{project_id}/clone", json=data)
        return Project(**response["data"])


class FilesAPI:
    """Files API endpoints."""

    def __init__(self, client: AlgoSDK):
        self.client = client

    def read(self, path: str, project_id: str) -> Dict[str, Any]:
        """Read file or directory."""
        response = self.client._request("GET", f"/files/{path}", params={"projectId": project_id})
        return response["data"]

    def create(self, path: str, project_id: str, content: str = "", directory: bool = False) -> Dict[str, Any]:
        """Create file or directory."""
        data = {"projectId": project_id, "content": content, "directory": directory}
        response = self.client._request("POST", f"/files/{path}", json=data)
        return response["data"]

    def update(self, path: str, project_id: str, content: str) -> Dict[str, Any]:
        """Update file."""
        data = {"projectId": project_id, "content": content}
        response = self.client._request("PUT", f"/files/{path}", json=data)
        return response["data"]

    def delete(self, path: str, project_id: str) -> None:
        """Delete file or directory."""
        self.client._request("DELETE", f"/files/{path}", params={"projectId": project_id})


class DeploymentsAPI:
    """Deployments API endpoints."""

    def __init__(self, client: AlgoSDK):
        self.client = client

    def get(self, deployment_id: int) -> Deployment:
        """Get deployment status."""
        response = self.client._request("GET", f"/deployments/{deployment_id}")
        return Deployment(**response["data"])

    def rollback(self, deployment_id: int) -> Deployment:
        """Rollback deployment."""
        response = self.client._request("POST", f"/deployments/{deployment_id}/rollback")
        return Deployment(**response["data"])


class WebhooksAPI:
    """Webhooks API endpoints."""

    def __init__(self, client: AlgoSDK):
        self.client = client

    def create(self, url: str, events: List[str], project_id: Optional[int] = None, secret: Optional[str] = None) -> Webhook:
        """Create webhook."""
        data = {"url": url, "events": events}
        if project_id:
            data["project_id"] = project_id
        if secret:
            data["secret"] = secret
        response = self.client._request("POST", "/webhooks", json=data)
        return Webhook(**response["data"])

    def get(self, webhook_id: int) -> Webhook:
        """Get webhook."""
        response = self.client._request("GET", f"/webhooks/{webhook_id}")
        return Webhook(**response["data"])

    def list(self, page: int = 1, limit: int = 20, project_id: Optional[int] = None) -> Dict[str, Any]:
        """List webhooks."""
        params = {"page": page, "limit": limit}
        if project_id:
            params["project_id"] = project_id
        response = self.client._request("GET", "/webhooks", params=params)
        return {
            "webhooks": [Webhook(**w) for w in response["data"]],
            "pagination": response["pagination"],
        }

    def update(self, webhook_id: int, **kwargs) -> Webhook:
        """Update webhook."""
        response = self.client._request("PUT", f"/webhooks/{webhook_id}", json=kwargs)
        return Webhook(**response["data"])

    def delete(self, webhook_id: int) -> None:
        """Delete webhook."""
        self.client._request("DELETE", f"/webhooks/{webhook_id}")

    def deliveries(self, webhook_id: int, page: int = 1, limit: int = 20) -> Dict[str, Any]:
        """Get webhook delivery history."""
        params = {"page": page, "limit": limit}
        response = self.client._request("GET", f"/webhooks/{webhook_id}/deliveries", params=params)
        return response["data"]


class ResourcesAPI:
    """Resources API endpoints."""

    def __init__(self, client: AlgoSDK):
        self.client = client

    def usage(self, **kwargs) -> Dict[str, Any]:
        """Get resource usage."""
        response = self.client._request("GET", "/resources/usage", params=kwargs)
        return response["data"]

    def limits(self) -> Dict[str, Any]:
        """Get resource limits."""
        response = self.client._request("GET", "/resources/limits")
        return response["data"]


class BillingAPI:
    """Billing API endpoints."""

    def __init__(self, client: AlgoSDK):
        self.client = client

    def get(self, start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict[str, Any]:
        """Get billing information."""
        params = {}
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date
        response = self.client._request("GET", "/billing", params=params)
        return response["data"]


class AIAPI:
    """AI API endpoints."""

    def __init__(self, client: AlgoSDK):
        self.client = client
        self.agents = AIAgentsAPI(client)
        self.models = AIModelsAPI(client)


class AIAgentsAPI:
    """AI Agents API endpoints."""

    def __init__(self, client: AlgoSDK):
        self.client = client

    def list(self, page: int = 1, limit: int = 20, category: Optional[str] = None) -> Dict[str, Any]:
        """List AI agents."""
        params = {"page": page, "limit": limit}
        if category:
            params["category"] = category
        response = self.client._request("GET", "/ai/agents", params=params)
        return {
            "agents": [AIAgent(**a) for a in response["data"]],
            "pagination": response["pagination"],
        }

    def invoke(self, agent_id: str, input_data: Any, context: Optional[Dict] = None, parameters: Optional[Dict] = None) -> Dict[str, Any]:
        """Invoke AI agent."""
        data = {"input": input_data}
        if context:
            data["context"] = context
        if parameters:
            data["parameters"] = parameters
        response = self.client._request("POST", f"/ai/agents/{agent_id}/invoke", json=data)
        return response["data"]


class AIModelsAPI:
    """AI Models API endpoints."""

    def __init__(self, client: AlgoSDK):
        self.client = client

    def list(self, page: int = 1, limit: int = 20, model_type: Optional[str] = None) -> Dict[str, Any]:
        """List ML models."""
        params = {"page": page, "limit": limit}
        if model_type:
            params["type"] = model_type
        response = self.client._request("GET", "/ai/models", params=params)
        return {
            "models": [MLModel(**m) for m in response["data"]],
            "pagination": response["pagination"],
        }

    def predict(self, model_id: str, input_data: Any, parameters: Optional[Dict] = None) -> Dict[str, Any]:
        """Run ML model prediction."""
        data = {"input": input_data}
        if parameters:
            data["parameters"] = parameters
        response = self.client._request("POST", f"/ai/models/{model_id}/predict", json=data)
        return response["data"]
