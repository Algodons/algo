"""Data models for Algo SDK."""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class User(BaseModel):
    """User model."""
    id: int
    email: str
    username: str
    name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None


class Project(BaseModel):
    """Project model."""
    id: int
    name: str
    description: Optional[str] = None
    template: Optional[str] = None
    visibility: str = "private"
    user_id: int
    created_at: datetime
    updated_at: datetime


class Deployment(BaseModel):
    """Deployment model."""
    id: int
    project_id: int
    status: str
    deployment_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    deployed_at: Optional[datetime] = None


class Webhook(BaseModel):
    """Webhook model."""
    id: int
    user_id: int
    project_id: Optional[int] = None
    url: str
    events: List[str]
    active: bool = True
    created_at: datetime


class AIAgent(BaseModel):
    """AI Agent model."""
    id: str
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    version: Optional[str] = None
    active: bool = True


class MLModel(BaseModel):
    """
    ML Model representation.
    
    Represents a machine learning model in the platform, including metadata
    about its type, version, and schema definitions for inputs and outputs.
    """
    id: str
    name: str
    description: Optional[str] = None
    type: str
    version: Optional[str] = None
    active: bool = True
