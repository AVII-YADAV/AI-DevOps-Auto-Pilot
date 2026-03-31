"""
Stack detection service.
Analyzes a project directory to determine the technology stack.
"""

import os
import json
from typing import Optional


class StackDetector:
    """Detects the technology stack of a project by analyzing its files."""

    STACK_INDICATORS = {
        "nodejs": {
            "files": ["package.json", "yarn.lock", "package-lock.json", "pnpm-lock.yaml"],
            "extensions": [".js", ".ts", ".jsx", ".tsx"],
        },
        "python": {
            "files": [
                "requirements.txt", "Pipfile", "pyproject.toml",
                "setup.py", "setup.cfg", "poetry.lock",
            ],
            "extensions": [".py"],
        },
        "go": {
            "files": ["go.mod", "go.sum"],
            "extensions": [".go"],
        },
        "rust": {
            "files": ["Cargo.toml", "Cargo.lock"],
            "extensions": [".rs"],
        },
        "java": {
            "files": ["pom.xml", "build.gradle", "build.gradle.kts"],
            "extensions": [".java", ".kt"],
        },
        "ruby": {
            "files": ["Gemfile", "Gemfile.lock"],
            "extensions": [".rb"],
        },
        "php": {
            "files": ["composer.json", "composer.lock"],
            "extensions": [".php"],
        },
        "static": {
            "files": ["index.html"],
            "extensions": [".html", ".htm"],
        },
    }

    @classmethod
    def detect(cls, project_path: str) -> Optional[str]:
        """
        Detect the stack of a project at the given path.
        Returns the stack name (e.g., 'nodejs', 'python') or None.
        """
        if not os.path.isdir(project_path):
            return None

        files_in_root = set(os.listdir(project_path))
        scores: dict[str, int] = {}

        for stack, indicators in cls.STACK_INDICATORS.items():
            score = 0

            # Check for indicator files
            for indicator_file in indicators["files"]:
                if indicator_file in files_in_root:
                    score += 10

            # Check file extensions in the project
            for root, dirs, files in os.walk(project_path):
                # Skip node_modules, .git, venv, etc.
                dirs[:] = [
                    d for d in dirs
                    if d not in {"node_modules", ".git", "__pycache__", "venv", ".venv", "vendor"}
                ]
                for f in files:
                    ext = os.path.splitext(f)[1].lower()
                    if ext in indicators["extensions"]:
                        score += 1

            if score > 0:
                scores[stack] = score

        if not scores:
            return None

        return max(scores, key=scores.get)

    @classmethod
    def detect_framework(cls, project_path: str, stack: str) -> Optional[str]:
        """Detect the specific framework within a stack."""
        if stack == "nodejs":
            return cls._detect_node_framework(project_path)
        elif stack == "python":
            return cls._detect_python_framework(project_path)
        return None

    @classmethod
    def _detect_node_framework(cls, project_path: str) -> Optional[str]:
        """Detect Node.js framework from package.json."""
        pkg_path = os.path.join(project_path, "package.json")
        if not os.path.exists(pkg_path):
            return None

        try:
            with open(pkg_path, "r") as f:
                pkg = json.load(f)
        except (json.JSONDecodeError, IOError):
            return None

        deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}

        if "next" in deps:
            return "nextjs"
        elif "nuxt" in deps:
            return "nuxt"
        elif "express" in deps:
            return "express"
        elif "fastify" in deps:
            return "fastify"
        elif "koa" in deps:
            return "koa"
        elif "react" in deps:
            return "react"
        elif "vue" in deps:
            return "vue"
        elif "svelte" in deps or "@sveltejs/kit" in deps:
            return "svelte"

        return "nodejs"

    @classmethod
    def _detect_python_framework(cls, project_path: str) -> Optional[str]:
        """Detect Python framework from requirements or project files."""
        requirements_files = ["requirements.txt", "Pipfile", "pyproject.toml"]

        all_deps = ""
        for req_file in requirements_files:
            req_path = os.path.join(project_path, req_file)
            if os.path.exists(req_path):
                try:
                    with open(req_path, "r") as f:
                        all_deps += f.read().lower() + "\n"
                except IOError:
                    continue

        if "fastapi" in all_deps:
            return "fastapi"
        elif "django" in all_deps:
            return "django"
        elif "flask" in all_deps:
            return "flask"
        elif "streamlit" in all_deps:
            return "streamlit"

        return "python"

    @classmethod
    def get_entry_point(cls, project_path: str, stack: str, framework: Optional[str]) -> str:
        """Determine the entry point command for the detected stack."""
        if stack == "nodejs":
            pkg_path = os.path.join(project_path, "package.json")
            if os.path.exists(pkg_path):
                try:
                    with open(pkg_path, "r") as f:
                        pkg = json.load(f)
                    scripts = pkg.get("scripts", {})
                    if "start" in scripts:
                        return "npm start"
                    if "main" in pkg:
                        return f"node {pkg['main']}"
                except (json.JSONDecodeError, IOError):
                    pass
            return "node index.js"

        elif stack == "python":
            if framework == "fastapi":
                # Look for main.py or app.py
                for entry in ["main.py", "app.py", "server.py"]:
                    if os.path.exists(os.path.join(project_path, entry)):
                        module = entry.replace(".py", "")
                        return f"uvicorn {module}:app --host 0.0.0.0 --port 8000"
                return "uvicorn main:app --host 0.0.0.0 --port 8000"
            elif framework == "django":
                return "python manage.py runserver 0.0.0.0:8000"
            elif framework == "flask":
                for entry in ["app.py", "main.py", "server.py"]:
                    if os.path.exists(os.path.join(project_path, entry)):
                        return f"python {entry}"
                return "python app.py"
            elif framework == "streamlit":
                for entry in ["app.py", "main.py"]:
                    if os.path.exists(os.path.join(project_path, entry)):
                        return f"streamlit run {entry} --server.port 8000 --server.address 0.0.0.0"
                return "streamlit run app.py --server.port 8000 --server.address 0.0.0.0"
            return "python main.py"

        elif stack == "static":
            return "python -m http.server 8000"

        return "echo 'Unknown stack'"
