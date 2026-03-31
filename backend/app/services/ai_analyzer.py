"""
AI analysis module.
Analyzes container logs to identify root causes and suggest fixes.
"""

import json
import logging
from typing import Optional

import httpx
from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert DevOps engineer and debugging assistant. 
You analyze application deployment logs and container errors to:
1. Identify the root cause of failures
2. Provide actionable fix suggestions
3. Suggest specific commands to resolve issues

Always respond in the following JSON format:
{
    "root_cause": "Clear description of what went wrong",
    "fix_suggestion": "Step-by-step instructions to fix the issue",
    "commands": ["command1", "command2"],
    "confidence": "low|medium|high"
}

Be specific, actionable, and practical. Consider common issues like:
- Missing dependencies or packages
- Port conflicts
- Permission issues
- Environment variable misconfigurations
- Memory/resource limits
- Network connectivity problems
- Syntax errors in configuration files
- Missing files or incorrect paths
- Version incompatibilities
"""


class AIAnalyzer:
    """
    Analyzes deployment logs using an LLM to identify issues and suggest fixes.
    Supports OpenAI-compatible APIs.
    """

    def __init__(self):
        self.api_key = settings.AI_API_KEY
        self.api_url = settings.AI_API_URL
        self.model = settings.AI_MODEL

    async def analyze_logs(
        self,
        logs: str,
        stack: Optional[str] = None,
        dockerfile: Optional[str] = None,
        additional_context: Optional[str] = None,
    ) -> dict:
        """
        Analyze deployment logs and return structured suggestions.

        Args:
            logs: The container/build logs to analyze
            stack: The detected technology stack
            dockerfile: The generated Dockerfile content
            additional_context: Any additional context from the user

        Returns:
            Dict with root_cause, fix_suggestion, commands, confidence
        """
        # Build the analysis prompt
        user_message = self._build_prompt(logs, stack, dockerfile, additional_context)

        # If no API key, fall back to rule-based analysis
        if not self.api_key:
            logger.warning("No AI API key configured, using rule-based analysis")
            return self._rule_based_analysis(logs, stack)

        try:
            result = await self._call_llm(user_message)
            return result
        except Exception as e:
            logger.error(f"AI analysis failed, falling back to rules: {str(e)}")
            return self._rule_based_analysis(logs, stack)

    def _build_prompt(
        self,
        logs: str,
        stack: Optional[str],
        dockerfile: Optional[str],
        additional_context: Optional[str],
    ) -> str:
        """Build the analysis prompt with all available context."""
        prompt_parts = [
            "Please analyze the following deployment logs and identify any issues:\n",
        ]

        if stack:
            prompt_parts.append(f"Technology Stack: {stack}\n")

        if dockerfile:
            prompt_parts.append(f"\n--- Dockerfile ---\n{dockerfile}\n---\n")

        prompt_parts.append(f"\n--- Deployment Logs ---\n{logs}\n---\n")

        if additional_context:
            prompt_parts.append(f"\nAdditional Context: {additional_context}\n")

        prompt_parts.append(
            "\nProvide your analysis in the specified JSON format."
        )

        return "\n".join(prompt_parts)

    async def _call_llm(self, user_message: str) -> dict:
        """Call the LLM API for analysis."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            "temperature": 0.3,
            "max_tokens": 1500,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.api_url, headers=headers, json=payload
            )
            response.raise_for_status()

        data = response.json()
        content = data["choices"][0]["message"]["content"]

        # Parse JSON from LLM response
        try:
            # Handle cases where LLM wraps JSON in markdown code blocks
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]

            result = json.loads(content.strip())
            return {
                "root_cause": result.get("root_cause", "Unknown"),
                "fix_suggestion": result.get("fix_suggestion", "No suggestion available"),
                "commands": json.dumps(result.get("commands", [])),
                "confidence": result.get("confidence", "medium"),
            }
        except json.JSONDecodeError:
            return {
                "root_cause": content[:500],
                "fix_suggestion": "Could not parse structured response. See root cause for raw analysis.",
                "commands": "[]",
                "confidence": "low",
            }

    def _rule_based_analysis(self, logs: str, stack: Optional[str] = None) -> dict:
        """
        Fallback rule-based analysis when LLM is unavailable.
        Covers common deployment failure patterns.
        """
        logs_lower = logs.lower()

        # Pattern matching for common errors
        patterns = [
            # Port conflicts
            {
                "pattern": ["address already in use", "eaddrinuse", "port is already allocated"],
                "root_cause": "Port conflict: The configured port is already in use by another process or container.",
                "fix_suggestion": "1. Check which process is using the port with 'lsof -i :<port>'\n2. Stop the conflicting process or choose a different port\n3. Re-deploy the application",
                "commands": ["lsof -i :<port>", "docker ps -a"],
                "confidence": "high",
            },
            # Module/package not found
            {
                "pattern": ["modulenotfounderror", "module not found", "cannot find module", "no module named"],
                "root_cause": "Missing dependency: A required module or package is not installed in the container.",
                "fix_suggestion": "1. Check that all dependencies are listed in requirements.txt or package.json\n2. Ensure the Dockerfile installs all dependencies\n3. If using a virtual environment, make sure it's activated in the container",
                "commands": ["pip freeze", "npm list"],
                "confidence": "high",
            },
            # Permission denied
            {
                "pattern": ["permission denied", "eacces", "eperm", "operation not permitted"],
                "root_cause": "Permission error: The application doesn't have sufficient permissions to access a file or resource.",
                "fix_suggestion": "1. Check file ownership and permissions inside the container\n2. Ensure the application user has access to required directories\n3. Avoid running as root; instead, set proper permissions in Dockerfile",
                "commands": ["ls -la /app", "whoami"],
                "confidence": "high",
            },
            # Out of memory
            {
                "pattern": ["out of memory", "oom", "killed", "memory limit"],
                "root_cause": "Memory limit exceeded: The container exceeded its allocated memory (512MB default).",
                "fix_suggestion": "1. Optimize application memory usage\n2. Increase the container memory limit\n3. Check for memory leaks in the application\n4. Consider using a lighter base image",
                "commands": ["docker stats", "free -m"],
                "confidence": "high",
            },
            # Connection refused (database, redis, etc.)
            {
                "pattern": ["connection refused", "econnrefused", "could not connect", "connection error"],
                "root_cause": "Connection refused: The application cannot connect to an external service (database, cache, API).",
                "fix_suggestion": "1. Verify the service is running and accessible from the container\n2. Check network configuration and Docker networking\n3. Ensure environment variables (DATABASE_URL, REDIS_URL, etc.) are correctly set",
                "commands": ["docker network ls", "docker network inspect autopilot-network"],
                "confidence": "medium",
            },
            # File not found
            {
                "pattern": ["no such file", "filenotfounderror", "enoent", "not found"],
                "root_cause": "File not found: A required file or directory doesn't exist in the container.",
                "fix_suggestion": "1. Check that all necessary files are included in the Docker build context\n2. Verify the WORKDIR and file paths in the Dockerfile\n3. Ensure .dockerignore isn't excluding required files",
                "commands": ["ls -la /app", "cat .dockerignore"],
                "confidence": "medium",
            },
            # Syntax error
            {
                "pattern": ["syntaxerror", "syntax error", "unexpected token", "parsing error"],
                "root_cause": "Syntax error in the application code. The application failed to start due to a code error.",
                "fix_suggestion": "1. Check the error message for the specific file and line number\n2. Fix the syntax error in the source code\n3. Re-deploy the application",
                "commands": [],
                "confidence": "high",
            },
            # Timeout
            {
                "pattern": ["timeout", "timed out", "deadline exceeded"],
                "root_cause": "Timeout: An operation took too long. This could be a network issue, slow dependency, or resource constraint.",
                "fix_suggestion": "1. Check network connectivity\n2. Increase timeout values in configuration\n3. Check if external services are responding\n4. Consider optimizing the operation or adding caching",
                "commands": ["curl -v http://service:port/health"],
                "confidence": "medium",
            },
        ]

        for pattern_group in patterns:
            for pattern in pattern_group["pattern"]:
                if pattern in logs_lower:
                    return {
                        "root_cause": pattern_group["root_cause"],
                        "fix_suggestion": pattern_group["fix_suggestion"],
                        "commands": json.dumps(pattern_group["commands"]),
                        "confidence": pattern_group["confidence"],
                    }

        # Default fallback
        return {
            "root_cause": "Unable to determine the exact root cause from the logs. The deployment may have encountered an unexpected error.",
            "fix_suggestion": (
                "1. Review the full deployment logs for specific error messages\n"
                "2. Check that the application starts correctly locally\n"
                "3. Verify all environment variables are set\n"
                "4. Ensure the Dockerfile correctly builds and runs the application"
            ),
            "commands": json.dumps(["docker logs <container_id>", "docker inspect <container_id>"]),
            "confidence": "low",
        }

    def validate_fix(self, commands: list[str]) -> list[dict]:
        """
        Validate fix commands before execution.
        Returns a list of validated commands with safety ratings.
        """
        safe_commands = []
        dangerous_patterns = [
            "rm -rf /",
            "rm -rf /*",
            "chmod 777",
            "curl | sh",
            "curl | bash",
            "wget | sh",
            "> /dev/sda",
            "mkfs",
            "dd if=",
            ":(){:|:&};:",
        ]

        for cmd in commands:
            is_safe = True
            for dangerous in dangerous_patterns:
                if dangerous in cmd.lower():
                    is_safe = False
                    break

            safe_commands.append({
                "command": cmd,
                "is_safe": is_safe,
                "warning": None if is_safe else "This command could be destructive. Review carefully before executing.",
            })

        return safe_commands


# Singleton instance
ai_analyzer = AIAnalyzer()
