"""
Algo Cloud IDE Platform SDK

Official Python SDK for interacting with the Algo platform API.
"""

from .client import AlgoSDK
from .models import User, Project, Deployment, Webhook
from .exceptions import AlgoAPIError, AlgoAuthError, AlgoNotFoundError

__version__ = "1.0.0"
__all__ = [
    "AlgoSDK",
    "User",
    "Project", 
    "Deployment",
    "Webhook",
    "AlgoAPIError",
    "AlgoAuthError",
    "AlgoNotFoundError",
]
