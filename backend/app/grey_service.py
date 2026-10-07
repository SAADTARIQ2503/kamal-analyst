from dataclasses import dataclass, field
from datetime import date
from typing import Any

from app import db
from app.config import Settings
from app.metrics import CostSummary, summarise_costs
from app.report import Report, build_report
from app.queries import GREY_ISSUANCE

FILTER_FIELDS = {
    "MNGR": "manager",
    "SO_TYPE": "order_type",
    "GREY_CLOSE_STATUS": "grey_status",
    "SHIPMENT_CLOSE_STATUS": "shipment_status",
}


@dataclass(frozen=True)
class GreyFilters:
    from_date: date | None = None
    to_date: date | None = None
    po: str | None = None
    manager: str | None = None
    order_type: str | None = None
    grey_status: str | None = None
    shipment_status: str | None = None
    shipment_close_date: date | None = None

    def is_empty(self) -> bool:
        return all(v is None for v in self.__dict__.values())


@dataclass
class GreyResult:
    columns: list[str]
    rows: list[dict[str, Any]]
    total_rows: int
    excluded_rows: int
    options: dict[str, list[str]]
    summary: CostSummary
    report: Report
    row_limit_reached: bool
    period_start: date | None = None
    period_end: date | None = None
    filters: GreyFilters = field(default_factory=GreyFilters)


def _options(rows: list[dict[str, Any]]) -> dict[str, list[str]]:
    keys = {
        "manager": "MNGR",
        "order_type": "SO_TYPE",
        "grey_status": "GREY_CLOSE_STATUS",
        "shipment_status": "SHIPMENT_CLOSE_STATUS",
        "po": "CNTRCT_NO",
        "shipment_close_date": "SHIPMENT_CLOSE_DATE",
    }
    return {name: sorted({str(r[col])[:10] if name == "shipment_close_date" else str(r[col]) for r in rows if r.get(col) not in (None, "")}) for name, col in keys.items()}


def _row_date(row: dict[str, Any]) -> date | None:
    value = row.get("GREY_CLOSE_DATE")
    if value in (None, ""):
        return None
    return date.fromisoformat(str(value)[:10])


def _matches(row: dict[str, Any], f: GreyFilters) -> bool:
    if f.po and f.po.upper() not in str(row.get("CNTRCT_NO") or "").upper():
        return False
    for column, attr in (("MNGR", "manager"), ("SO_TYPE", "order_type"), ("GREY_CLOSE_STATUS", "grey_status"), ("SHIPMENT_CLOSE_STATUS", "shipment_status")):
        wanted = getattr(f, attr)
        if wanted and str(row.get(column) or "") != wanted:
            return False
    if f.shipment_close_date:
        value = row.get("SHIPMENT_CLOSE_DATE")
        if value in (None, "") or str(value)[:10] != f.shipment_close_date.isoformat():
            return False
    if f.from_date or f.to_date:
        d = _row_date(row)
        if d is None:
            return False
        if f.from_date and d < f.from_date:
            return False
        if f.to_date and d > f.to_date:
            return False
    return True


def load_grey(settings: Settings, f: GreyFilters) -> GreyResult:
    columns, raw_rows = db.run_select(GREY_ISSUANCE, row_limit=settings.db_row_limit, timeout_ms=settings.db_query_timeout_ms)
    limit_hit = len(raw_rows) > settings.db_row_limit
    all_rows = [dict(zip(columns, r)) for r in raw_rows[: settings.db_row_limit]]
    kept = [r for r in all_rows if _matches(r, f)]
    dates = [d for d in (_row_date(r) for r in kept) if d is not None]
    return GreyResult(
        columns=columns,
        rows=kept,
        total_rows=len(all_rows),
        excluded_rows=len(all_rows) - len(kept),
        options=_options(all_rows),
        summary=summarise_costs(kept),
        report=build_report(kept),
        row_limit_reached=limit_hit,
        period_start=min(dates) if dates else None,
        period_end=max(dates) if dates else None,
        filters=f,
    )
