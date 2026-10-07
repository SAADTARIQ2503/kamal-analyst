from dataclasses import dataclass, field
from datetime import date
from typing import Any

from app import db
from app.config import Settings
from app.metrics import CostSummary, summarise_costs
from app.queries import CUT_TO_PACK
from app.report import Report, build_report, po_extremes


@dataclass(frozen=True)
class CutFilters:
    po: str | None = None

    def is_empty(self) -> bool:
        return self.po is None


@dataclass
class CutResult:
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
    filters: CutFilters = field(default_factory=CutFilters)


def _normalise(row: dict[str, Any]) -> dict[str, Any]:
    completed = "CLOSE"
    return {
        **row,
        "P_VALUE": row.get("PACK_SET_PRE_AMNT"),
        "I_VALUE": row.get("PACK_SET_POST_AMNT"),
        "P_RATE": row.get("PRE_RATE"),
        "I_RATE": row.get("POST_RATE"),
        "GREY_CLOSE_STATUS": completed,
        "MNGR": "",
    }


def load_cut_to_pack(settings: Settings, f: CutFilters) -> CutResult:
    columns, raw_rows = db.run_select(CUT_TO_PACK, row_limit=settings.db_row_limit, timeout_ms=settings.db_query_timeout_ms)
    limit_hit = len(raw_rows) > settings.db_row_limit
    all_rows = [_normalise(dict(zip(columns, r))) for r in raw_rows[: settings.db_row_limit]]
    kept = [r for r in all_rows if not f.po or f.po.upper() in str(r.get("CNTRCT_NO") or "").upper()]
    dates = [r["CREATION_DATE"] for r in kept if r.get("CREATION_DATE")]
    report = build_report(kept)
    report.biggest_saving, report.biggest_overrun = po_extremes(kept)
    report.chips = {
        "all": len(kept),
        "profit": report.profit_pos,
        "loss": report.loss_pos,
        "grey_complete": len(kept),
        "grey_incomplete": 0,
        "no_issue_cost": sum(1 for r in kept if r.get("PACK_SET_POST_AMNT") == 0),
    }
    return CutResult(
        columns=columns,
        rows=kept,
        total_rows=len(all_rows),
        excluded_rows=len(all_rows) - len(kept),
        options={"po": sorted({str(r["CNTRCT_NO"]) for r in all_rows if r.get("CNTRCT_NO")})},
        summary=summarise_costs(kept),
        report=report,
        row_limit_reached=limit_hit,
        period_start=min((date.fromisoformat(str(d)[:10]) for d in dates), default=None),
        period_end=max((date.fromisoformat(str(d)[:10]) for d in dates), default=None),
        filters=f,
    )
