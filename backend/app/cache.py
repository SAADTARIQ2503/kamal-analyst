import threading
import time
from typing import Any, Callable

_lock = threading.Lock()
_store: dict[str, tuple[float, Any]] = {}


def remember(key: str, ttl_seconds: float, make: Callable[[], Any]) -> Any:
    now = time.monotonic()
    with _lock:
        hit = _store.get(key)
        if hit and now - hit[0] < ttl_seconds:
            return hit[1]
    value = make()
    with _lock:
        _store[key] = (time.monotonic(), value)
    return value
