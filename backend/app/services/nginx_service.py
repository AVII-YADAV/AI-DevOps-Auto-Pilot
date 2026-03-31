"""
Nginx dynamic routing service.
Generates, saves, and reloads Nginx configurations securely.
"""

import os
import re
import subprocess
import logging
from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Fallback config dir, usually /etc/nginx/sites-enabled on Ubuntu
NGINX_CONF_DIR = os.environ.get("NGINX_CONF_DIR", "/etc/nginx/sites-enabled")
BASE_DOMAIN = getattr(settings, "BASE_DOMAIN", "localhost")


class NginxService:
    """Manages secure generation and reloading of Nginx config files."""

    @staticmethod
    def validate_project_id(project_id: str) -> bool:
        """
        Ensure project_id is safe for use in filenames and configurations.
        Only alphanumeric and hyphens allowed to prevent injection.
        """
        if not project_id:
            return False
        return bool(re.match(r"^[a-zA-Z0-9\-]+$", project_id))

    @staticmethod
    def generate_config_content(project_id: str, port: int) -> str:
        """
        Statically generate standard proxy configuration.
        """
        domain = f"{project_id}.{BASE_DOMAIN}"
        return f"""
server {{
    listen 80;
    server_name {domain};

    location / {{
        proxy_pass http://localhost:{port};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}
}}
"""

    @classmethod
    def create_config(cls, project_id: str, port: int) -> str:
        """
        Safely generates and writes the Nginx configuration file.
        Returns the public URL for the deployment.
        """
        if not cls.validate_project_id(project_id):
            raise ValueError(f"Invalid project ID for Nginx routing: {project_id}")

        os.makedirs(NGINX_CONF_DIR, exist_ok=True)
        config_path = os.path.join(NGINX_CONF_DIR, f"{project_id}.conf")
        
        # Avoid direct overwrite conflicts during race conditions
        if os.path.exists(config_path):
            logger.warning(f"Overwriting existing Nginx config at {config_path}")

        config_content = cls.generate_config_content(project_id, port)
        
        # Write securely
        try:
            with open(config_path, "w") as f:
                f.write(config_content)
            logger.info(f"Nginx config created securely at {config_path}")
        except PermissionError:
            raise RuntimeError(f"Permission denied writing Nginx config to {config_path}. Ensure running with adequate permissions.")
        except Exception as e:
            raise RuntimeError(f"Failed to write Nginx config: {e}")

        # Try to reload Nginx
        cls.reload_nginx(config_path)
            
        return f"http://{project_id}.{BASE_DOMAIN}"

    @staticmethod
    def reload_nginx(config_path: str):
        """
        Test the Nginx config, then securely reload it.
        If it fails, abort and clean up the breaking config.
        """
        try:
            # 1. Test config
            test_result = subprocess.run(
                ["nginx", "-t"], 
                capture_output=True, 
                text=True, 
                timeout=10
            )

            if test_result.returncode != 0:
                # Syntax error - rollback config to prevent total Nginx outage
                if os.path.exists(config_path):
                    os.remove(config_path)
                logger.error(f"Nginx syntax error: {test_result.stderr}")
                raise RuntimeError(f"Nginx config test failed: {test_result.stderr}")

            # 2. Secure Reload
            reload_result = subprocess.run(
                ["nginx", "-s", "reload"], 
                capture_output=True, 
                text=True, 
                timeout=10
            )
            
            if reload_result.returncode != 0:
                logger.error(f"Nginx reload failed: {reload_result.stderr}")
                raise RuntimeError(f"Failed to reload Nginx: {reload_result.stderr}")
                
            logger.info("Successfully reloaded Nginx.")
            
        except FileNotFoundError:
            # When testing locally on environments without Nginx
            logger.warning("Nginx executable not found. Skipping reload.")
        except subprocess.TimeoutExpired:
            raise RuntimeError("Nginx reload operation timed out.")

# Singleton export
nginx_service = NginxService()
