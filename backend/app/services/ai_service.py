"""
AI Error Analysis Service.
Connects to an LLM to analyze deployment logs asynchronously.
"""

import os
import json
import logging
import httpx
from typing import Dict, Any, Optional
from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Fallback environment configuration
AI_API_KEY = getattr(settings, "AI_API_KEY", os.environ.get("OPENAI_API_KEY", ""))
AI_API_URL = getattr(settings, "AI_API_URL", "https://api.openai.com/v1/chat/completions")
AI_MODEL = getattr(settings, "AI_MODEL", "gpt-4")


class AIService:
    """Production-grade LLM analyzer."""

    @staticmethod
    def _truncate_logs(logs: str, max_length: int = 4000) -> str:
        """Truncate logs securely to prevent token overflow."""
        if not logs:
            return ""
            
        # If logs exceed limit, take the end of the logs (where errors usually are)
        if len(logs) > max_length:
            return f"... [TRUNCATED] ...\n{logs[-max_length:]}"
            
        return logs

    @staticmethod
    def _parse_llm_response(content: str) -> Dict[str, Any]:
        """Safely extract JSON from the LLM text output."""
        try:
            # Strip markdown formatting if any
            clean_content = content.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_content)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse LLM response as JSON: {content}")
            return {
                "root_cause": "Failed to parse AI response.",
                "explanation": content[:500],
                "fix": "N/A",
                "commands": "N/A"
            }

    async def analyze_logs(self, raw_logs: str) -> Dict[str, Any]:
        """Send truncated logs to the AI and return structured feedback."""
        if not raw_logs or len(raw_logs.strip()) == 0:
            raise ValueError("Empty logs provided to AI Analyzer.")

        if not AI_API_KEY:
            logger.warning("No API Key provided. Returning mock response for safety.")
            return {
                "root_cause": "API Key Missing",
                "explanation": "To use the AI analyzer, you must provide OPENAI_API_KEY.",
                "fix": "Configure environment variables",
                "commands": "export OPENAI_API_KEY='your-key'"
            }

        sanitized_logs = self._truncate_logs(raw_logs)

        prompt = f"""You are a DevOps expert.
Analyze the following logs:

{sanitized_logs}

Return ONLY a perfectly formatted JSON object with the following keys, with no markdown wrappers:
- "root_cause": A short sentence identifying the exact error.
- "explanation": A detailed, clear explanation of why it happened.
- "fix": A clear explanation of how to fix it securely.
- "commands": A single bash command or a short string of safe commands to resolve the issue. If not applicable, return "N/A".
"""

        headers = {
            "Authorization": f"Bearer {AI_API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": AI_MODEL,
            "messages": [
                {"role": "system", "content": "You are an automated code helper. Respond strictly in JSON format matching the schema."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2, # Low temperature for analytical consistency
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(AI_API_URL, json=payload, headers=headers)
                
                if response.status_code != 200:
                    logger.error(f"LLM API failed [{response.status_code}]: {response.text}")
                    raise RuntimeError(f"AI API integration failure: {response.status_code}")
                    
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                
                return self._parse_llm_response(content)

        except httpx.RequestError as e:
            logger.error(f"Network error querying LLM: {e}")
            raise RuntimeError(f"Failed to connect to AI provider: {str(e)}")

# Singleton instance
ai_service = AIService()
