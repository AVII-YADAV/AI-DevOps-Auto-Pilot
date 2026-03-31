"""
Dynamic port allocator.
Manages port allocation for containers to avoid conflicts.
"""

import redis
from app.core.config import get_settings

settings = get_settings()


class PortAllocator:
    """Thread-safe port allocator using Redis for coordination."""

    REDIS_KEY = "autopilot:allocated_ports"

    def __init__(self):
        self._redis = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
        self._port_start = settings.PORT_RANGE_START
        self._port_end = settings.PORT_RANGE_END

    def allocate(self) -> int:
        """
        Allocate the next available port.
        Uses Redis set to track allocated ports atomically.
        """
        pipe = self._redis.pipeline()
        try:
            for port in range(self._port_start, self._port_end + 1):
                # SISMEMBER + SADD in a pipeline for atomicity
                added = self._redis.sadd(self.REDIS_KEY, str(port))
                if added:
                    return port

            raise RuntimeError(
                f"No available ports in range {self._port_start}-{self._port_end}"
            )
        finally:
            pipe.reset()

    def release(self, port: int) -> None:
        """Release a previously allocated port back to the pool."""
        self._redis.srem(self.REDIS_KEY, str(port))

    def is_allocated(self, port: int) -> bool:
        """Check if a port is currently allocated."""
        return self._redis.sismember(self.REDIS_KEY, str(port))

    def get_allocated_ports(self) -> set[int]:
        """Get all currently allocated ports."""
        return {int(p) for p in self._redis.smembers(self.REDIS_KEY)}

    def available_count(self) -> int:
        """Get the number of available ports."""
        allocated = self._redis.scard(self.REDIS_KEY)
        total = self._port_end - self._port_start + 1
        return total - allocated


# Singleton instance
port_allocator = PortAllocator()
