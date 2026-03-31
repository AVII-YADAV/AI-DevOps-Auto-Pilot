"""
Deployment orchestrator service.
Clones repo, detects stack, builds, and runs.
"""

import os
import uuid
import json
import logging
import shutil
from urllib.parse import urlparse
from typing import Dict, Any

from git import Repo, GitCommandError
from pydantic import HttpUrl

from app.services.docker_service import docker_service
from app.utils.port_manager import port_manager

logger = logging.getLogger(__name__)

# Base path for cloning repsositories
BASE_APPS_DIR = os.environ.get("APPS_DIR", "/opt/apps")


class DeployService:
    """Orchestrates the deployment pipeline synchronously."""

    @staticmethod
    def validate_repo_url(repo_url: str) -> bool:
        """Simple validation for a GitHub URL."""
        if not repo_url:
            return False
        
        parsed = urlparse(str(repo_url))
        if parsed.scheme not in ("http", "https", "git"):
            return False
            
        return True

    @staticmethod
    def clone_repo(repo_url: str, project_id: str) -> str:
        """Clones a repository into a project-specific directory."""
        if not DeployService.validate_repo_url(repo_url):
            raise ValueError(f"Invalid repository URL: {repo_url}")

        target_dir = os.path.join(BASE_APPS_DIR, project_id)
        
        # Clean directory if exists
        if os.path.exists(target_dir):
            shutil.rmtree(target_dir, ignore_errors=True)
            
        os.makedirs(target_dir, exist_ok=True)
        
        try:
            logger.info(f"Cloning {repo_url} into {target_dir}")
            Repo.clone_from(str(repo_url), target_dir, depth=1)
            return target_dir
        except GitCommandError as e:
            logger.error(f"Git clone failed: {e}")
            if "Authentication" in str(e) or "not found" in str(e):
                raise ValueError(f"Failed to clone repository. Make sure it is public and url is correct: {str(e)}")
            raise RuntimeError(f"Failed to clone repository: {str(e)}")

    @staticmethod
    def detect_stack(app_dir: str) -> tuple[str, str, int]:
        """
        Detects stack and returns (stack_name, entry_point, container_port).
        """
        req_path = os.path.join(app_dir, "requirements.txt")
        pkg_path = os.path.join(app_dir, "package.json")
        
        if os.path.exists(req_path):
            stack = "python"
            container_port = 8000
            # Basic entry point guess
            entry_point = "main.py"
            for f in ["app.py", "server.py", "run.py"]:
                if os.path.exists(os.path.join(app_dir, f)):
                    entry_point = f
                    break
            logger.info(f"Detected stack: Python, Entry: {entry_point}")
            return stack, entry_point, container_port
            
        elif os.path.exists(pkg_path):
            stack = "nodejs"
            container_port = 3000
            entry_point = "index.js"
            
            try:
                with open(pkg_path, "r") as f:
                    pkg = json.load(f)
                    
                if "start" in pkg.get("scripts", {}):
                    entry_point = "npm start"
                elif "main" in pkg:
                    entry_point = pkg["main"]
            except Exception as e:
                logger.warning(f"Failed to parse package.json: {e}")
                
            logger.info(f"Detected stack: Node.js, Entry: {entry_point}")
            return stack, entry_point, container_port
            
        raise ValueError("Unsupported stack: Ensure repo has requirements.txt (Python) or package.json (Node.js)")

    @classmethod
    def deploy_project(cls, repo_url: str) -> Dict[str, Any]:
        """
        Full deployment pipeline:
        Repo URL -> Clone -> Detect Stack -> Generate Dockerfile -> Build -> Run Container -> Route Nginx
        """
        from app.services.nginx_service import nginx_service
        project_id = uuid.uuid4().hex[:8]
        
        try:
            # 1. Clone
            app_dir = cls.clone_repo(repo_url, project_id)
            
            # 2. Detect Stack
            stack, entry_point, container_port = cls.detect_stack(app_dir)
            
            # 3. Generate Dockerfile
            dockerfile_content = docker_service.dockerfile_generator(stack, entry_point)
            
            # 4. Build
            image_name = docker_service.build_image(project_id, app_dir, dockerfile_content)
            
            # 5. Run Container with Port Allocation
            host_port = port_manager.get_free_port()
            run_result = docker_service.run_container(
                project_id=project_id,
                image_name=image_name,
                host_port=host_port,
                container_port=container_port
            )
            
            # 6. Generate Nginx Route
            public_url = nginx_service.create_config(project_id, host_port)
            
            # 7. Return Data
            return {
                "project_id": project_id,
                "url": public_url,
                "status": run_result["status"]
            }
            
        except Exception as e:
            logger.error(f"Deployment pipeline failed: {e}")
            return {
                "project_id": project_id,
                "url": None,
                "status": f"failed: {str(e)}"
            }

# Singleton instance
deploy_service = DeployService()
