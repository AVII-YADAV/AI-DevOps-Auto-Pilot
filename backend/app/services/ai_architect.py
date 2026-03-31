"""
AI Architect service.
Provides infrastructure blueprints and optimization strategies for deployments.
"""

import json
import logging
from typing import Optional, List

import httpx
from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

ARCHITECT_PROMPT = """You are a Senior Cloud Solutions Architect and Platform Engineer.
Your task is to analyze an application's tech stack and deployment configuration to provide a "Strategic Infrastructure Blueprint".

Analyze the input and provide:
1. Optimization Strategy: How to make the build faster and the image smaller.
2. Stability Insights: Potential runtime bottlenecks.
3. Scaling Recommendations: How to scale this specific architecture.
4. Security Hardening: Specific steps to secure the container and app.

Always respond in the following JSON format:
{
    "score": 0-100,
    "archetype": "Monolith | Microservice | Static | Serverless-style",
    "recommendations": [
        {"category": "Performance | Security | Scaling", "suggestion": "Clear text", "impact": "High | Medium | Low"}
    ],
    "blueprint_summary": "A 2-3 sentence strategic overview"
}

Be technically precise and use industry-standard terminology.
"""

class AIArchitect:
    """
    Analyzes application architecture to provide strategic infrastructure blueprints.
    """

    def __init__(self):
        self.api_key = settings.AI_API_KEY
        self.api_url = settings.AI_API_URL
        self.model = settings.AI_MODEL

    async def generate_blueprint(
        self,
        stack: str,
        dockerfile: str,
        project_name: str,
        repo_structure: Optional[List[str]] = None
    ) -> dict:
        """
        Generate a strategic blueprint for a project.
        """
        user_message = (
            f"Project: {project_name}\n"
            f"Tech Stack: {stack}\n"
            f"Dockerfile:\n{dockerfile}\n"
        )
        
        if repo_structure:
            user_message += f"Repo Structure (Top Level): {', '.join(repo_structure)}\n"

        if not self.api_key:
            return self._fallback_blueprint(stack)

        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": ARCHITECT_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                "temperature": 0.4,
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(self.api_url, headers=headers, json=payload)
                response.raise_for_status()
            
            content = response.json()["choices"][0]["message"]["content"]
            
            # Extract JSON
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
                
            return json.loads(content.strip())

        except Exception as e:
            logger.error(f"AI Architect failed: {str(e)}")
            return self._fallback_blueprint(stack)

    def _fallback_blueprint(self, stack: str) -> dict:
        """Generic fallback blueprint based on tech stack."""
        return {
            "score": 75,
            "archetype": "Standard Web Application",
            "recommendations": [
                {"category": "Stability", "suggestion": f"Standard {stack} deployment pattern detected. Ensure environment variables are loaded via .env overrides.", "impact": "Medium"},
                {"category": "Scaling", "suggestion": "Horizontal pod autoscaling recommended once baseline traffic is established.", "impact": "High"},
                {"category": "Build", "suggestion": "Layer caching is enabled. Monitor build times as project grows.", "impact": "Low"}
            ],
            "blueprint_summary": f"A reliable {stack} deployment using best-practice containerization defaults and automated AI oversight."
        }

# Singleton
ai_architect = AIArchitect()
