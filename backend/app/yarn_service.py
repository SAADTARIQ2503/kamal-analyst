from dataclasses import dataclass, field
from typing import Any

from app import db
from app.config import Settings
from app.metrics import CostSummary, summarise_costs
from app.queries import YARN
from app.report import Report, build_report, po_extremes


@dataclass(frozen=True)
class YarnFilters:
    po: str | None = None

    def is_empty(self) -> bool:
        return self.po is None


@dataclass
class YarnResult:
    columns: list[str]
    rows: list[dict[str, Any]]
    total_rows: int
    excluded_rows: int
    options: dict[str, list[str]]
    summary: CostSummary
    report: Report
    row_limit_reached: bool
    period_start: Any = None
    period_end: Any = None
    filters: YarnFilters = field(default_factory=YarnFilters)


def _normalise(row: dict[str, Any]) -> dict[str, Any]:
    completed = (row.get("ISS_KGS") or 0) >= (row.get("REQ_KGS") or 0)
    return {
        **row,
        "P_VALUE": row.get("ISS_PRE_AMNT"),
        "I_VALUE": row.get("POST_AMNT"),
        "P_RATE": row.get("PRE_RATE"),
        "I_RATE": row.get("POST_RATE"),
        "GREY_CLOSE_STATUS": "CLOSE" if completed else "RUNNING",
        "MNGR": "",
    }


def load_yarn(settings: Settings, f: YarnFilters) -> YarnResult:
    columns, raw_rows = db.run_select(YARN, row_limit=settings.db_row_limit, timeout_ms=settings.db_query_timeout_ms)
    limit_hit = len(raw_rows) > settings.db_row_limit
    all_rows = [_normalise(dict(zip(columns, r))) for r in raw_rows[: settings.db_row_limit]]
    kept = [r for r in all_rows if not f.po or f.po.upper() in str(r.get("CNTRCT_NO") or "").upper()]
    report = build_report(kept)
    report.biggest_saving, report.biggest_overrun = po_extremes(kept)
    report.chips = {
        "all": len(kept),
        "profit": report.profit_pos,
        "loss": report.loss_pos,
        "grey_complete": sum(1 for r in kept if r["GREY_CLOSE_STATUS"] == "CLOSE"),
        "grey_incomplete": sum(1 for r in kept if r["GREY_CLOSE_STATUS"] != "CLOSE"),
    }
    return YarnResult(
        columns=columns,
        rows=kept,
        total_rows=len(all_rows),
        excluded_rows=len(all_rows) - len(kept),
        options={"po": sorted({str(r["CNTRCT_NO"]) for r in all_rows if r.get("CNTRCT_NO")})},
        summary=summarise_costs(kept),
        report=report,
        row_limit_reached=limit_hit,
        filters=f,
    )
