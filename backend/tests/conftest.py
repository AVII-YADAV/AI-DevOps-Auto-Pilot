"""
Pytest configuration and common fixtures.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock

@pytest.fixture
def mock_db_session():
    """Mock database session for unit tests."""
    session = AsyncMock()
    # Mocking standard SQLAlchemy async operations
    session.execute = AsyncMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.add = MagicMock()
    session.delete = AsyncMock()
    return session
