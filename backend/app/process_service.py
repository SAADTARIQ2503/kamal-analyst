from dataclasses import dataclass, field
from datetime import date
from typing import Any

from app import db
from app.config import Settings
from app.metrics import CostSummary, summarise_costs
from app.queries import PROCESSING
from app.report import Report, build_report


@dataclass(frozen=True)
class ProcessFilters:
    from_date: date | None = None
    to_date: date | None = None
    po: str | None = None
    manager: str | None = None
    process: str | None = None
    party_type: str | None = None

    def is_empty(self) -> bool:
        return all(v is None for v in self.__dict__.values())


@dataclass
class ProcessResult:
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
    filters: ProcessFilters = field(default_factory=ProcessFilters)


def _normalise(row: dict[str, Any]) -> dict[str, Any]:
    return {
        **row,
        "P_VALUE": row.get("PRE_COST_AMNT"),
        "I_VALUE": row.get("POST_COST_AMNT"),
        "P_RATE": row.get("PRE_RATE"),
        "I_RATE": row.get("POST_RATE"),
        "MNGR": row.get("MNGR_ID"),
        "CNTRCT": row.get("CNTRCT_NO"),
    }


def _date(value: Any) -> date | None:
    if value in (None, ""):
        return None
    return date.fromisoformat(str(value)[:10])


def _party(row: dict[str, Any]) -> str:
    return "in_house" if str(row.get("PARTY_ID") or "0") == "0" else "commercial"


def _matches(row: dict[str, Any], f: ProcessFilters) -> bool:
    if f.po and f.po.upper() not in str(row.get("CNTRCT_NO") or "").upper():
        return False
    if f.manager and str(row.get("MNGR_ID") or "") != f.manager:
        return False
    if f.process and str(row.get("PRCS") or "") != f.process:
        return False
    if f.party_type and _party(row) != f.party_type:
        return False
    if f.from_date or f.to_date:
        d = _date(row.get("LOT_COST_DATE"))
        if d is None:
            return False
        if f.from_date and d < f.from_date:
            return False
        if f.to_date and d > f.to_date:
            return False
    return True


def _options(rows: list[dict[str, Any]]) -> dict[str, list[str]]:
    return {
        "po": sorted({str(r["CNTRCT_NO"]) for r in rows if r.get("CNTRCT_NO")}),
        "manager": sorted({str(r["MNGR_ID"]) for r in rows if r.get("MNGR_ID") not in (None, "")}),
        "process": sorted({str(r["PRCS"]) for r in rows if r.get("PRCS")}),
    }


def load_processing(settings: Settings, f: ProcessFilters) -> ProcessResult:
    columns, raw_rows = db.run_select(PROCESSING, row_limit=settings.db_row_limit, timeout_ms=settings.db_query_timeout_ms)
    limit_hit = len(raw_rows) > settings.db_row_limit
    all_rows = [_normalise(dict(zip(columns, r))) for r in raw_rows[: settings.db_row_limit]]
    kept = [r for r in all_rows if _matches(r, f)]
    dates = [d for d in (_date(r.get("LOT_COST_DATE")) for r in kept) if d is not None]
    report = build_report(kept)
    chips = {
        "all": len(kept),
        "profit": report.profit_pos,
        "loss": report.loss_pos,
        "no_actual_cost": sum(1 for r in kept if r.get("POST_COST_AMNT") is None),
    }
    for r in kept:
        key = f"process:{r.get('PRCS') or ''}"
        chips[key] = chips.get(key, 0) + 1
    report.chips = chips
    return ProcessResult(
        columns=columns,
        rows=kept,
        total_rows=len(all_rows),
        excluded_rows=len(all_rows) - len(kept),
        options=_options(all_rows),
        summary=summarise_costs(kept),
        report=report,
        row_limit_reached=limit_hit,
        period_start=min(dates) if dates else None,
        period_end=max(dates) if dates else None,
        filters=f,
    )
