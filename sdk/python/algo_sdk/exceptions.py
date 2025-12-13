"""Exception classes for Algo SDK."""


class AlgoAPIError(Exception):
    """Base exception for all Algo API errors."""
    
    def __init__(self, message: str, status_code: int = None, response: dict = None):
        self.message = message
        self.status_code = status_code
        self.response = response
        super().__init__(self.message)


class AlgoAuthError(AlgoAPIError):
    """Raised when authentication fails."""
    pass


class AlgoNotFoundError(AlgoAPIError):
    """Raised when a resource is not found."""
    pass


class AlgoValidationError(AlgoAPIError):
    """Raised when request validation fails."""
    pass


class AlgoRateLimitError(AlgoAPIError):
    """Raised when rate limit is exceeded."""
    pass
