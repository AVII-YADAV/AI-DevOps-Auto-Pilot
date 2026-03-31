"""
Dynamic port manager for assigning ports to Docker containers.
"""

import socket
import logging

logger = logging.getLogger(__name__)


class PortManager:
    """Manages allocation of free ports."""

    @staticmethod
    def get_free_port(start_port: int = 3000, end_port: int = 4000) -> int:
        """
        Find a free port on the host in the given range.
        Uses socket binding to check availability.
        """
        for port in range(start_port, end_port + 1):
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                try:
                    s.bind(("", port))
                    return port
                except OSError:
                    continue
        
        raise RuntimeError(f"No available ports found in range {start_port}-{end_port}")

# Singleton instance
port_manager = PortManager()
