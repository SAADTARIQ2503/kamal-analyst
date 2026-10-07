from collections import defaultdict
from datetime import date
from decimal import Decimal
from typing import Any, Callable

from app.metrics import to_decimal


def monthly(rows: list[dict[str, Any]], date_of: Callable[[dict[str, Any]], date | None]) -> list[dict[str, Any]]:
    buckets: dict[str, dict[str, Any]] = defaultdict(lambda: {"po_count": 0, "estimated": Decimal(0), "actual": Decimal(0), "saving": Decimal(0)})
    for r in rows:
        d = date_of(r)
        est, act = to_decimal(r.get("P_VALUE")), to_decimal(r.get("I_VALUE"))
        if d is None or est is None or act is None:
            continue
        b = buckets[d.strftime("%Y-%m")]
        b["po_count"] += 1
        b["estimated"] += est
        b["actual"] += act
        b["saving"] += est - act
    return [
        {"month": m, "po_count": b["po_count"], "estimated_pkr": str(b["estimated"]), "actual_pkr": str(b["actual"]), "saving_pkr": str(b["saving"])}
        for m, b in sorted(buckets.items())
    ]


def iso_date(value: Any) -> date | None:
    if value in (None, ""):
        return None
    return date.fromisoformat(str(value)[:10])
