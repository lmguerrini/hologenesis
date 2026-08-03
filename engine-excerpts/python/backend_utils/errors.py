"""Shared exception types."""


class ApplicationError(Exception):
    """Base exception for general failures."""


class ConfigurationError(ApplicationError):
    """Raised when runtime configuration is invalid."""


class RoutingError(ApplicationError):
    """Raised when a request cannot be routed safely."""
