"""
Unit tests for the Deployment Engine setup.
"""

import pytest
from unittest.mock import patch, MagicMock

from app.services.deployment_engine import DeploymentEngine


@pytest.fixture
@patch("docker.from_env")
def engine(mock_docker):
    """Provide a mocked deployment engine."""
    # We pass mock_docker because DeploymentEngine calls docker.from_env() on init
    return DeploymentEngine()


def test_deployment_engine_initialization(engine):
    """Test engine initializes and acquires a docker client."""
    assert engine.docker_client is not None


@patch("app.services.deployment_engine.Repo.clone_from")
def test_deployment_engine_clone_repository(mock_clone, engine):
    """Test repository cloning mechanism."""
    repo_url = "https://github.com/example/repo.git"
    target_dir = "/tmp/test-repo"
    
    result = engine.clone_repository(repo_url, target_dir)
    
    assert result == target_dir
    mock_clone.assert_called_once_with(
        repo_url, target_dir, depth=1, single_branch=True
    )

@patch("builtins.open")
def test_deployment_engine_build_image(mock_open, engine):
    """Test Docker image building calling the client correctly."""
    engine.docker_client.images.build = MagicMock(
        return_value=(MagicMock(id="sha256:12345"), [{"stream": "Step 1/1..."}])
    )
    
    image_id = engine.build_image("/fake/path", "test-image:latest", "FROM node:20")
    
    assert image_id == "sha256:12345"
    engine.docker_client.images.build.assert_called_once_with(
        path="/fake/path",
        tag="test-image:latest",
        rm=True,
        forcerm=True,
        nocache=False,
    )
    mock_open.assert_called_once()
