from collections import defaultdict
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any

from app.metrics import CostSummary, to_decimal

HUNDRED = Decimal(100)


@dataclass(frozen=True)
class PoAmount:
    po: str
    manager: str
    amount: Decimal


@dataclass
class Report:
    profit_pkr: Decimal = Decimal(0)
    profit_pos: int = 0
    loss_pkr: Decimal = Decimal(0)
    loss_pos: int = 0
    biggest_saving: PoAmount | None = None
    biggest_overrun: PoAmount | None = None
    chips: dict[str, int] = field(default_factory=dict)
    manager_actuals: list[tuple[str, Decimal, int]] = field(default_factory=list)


def po_variance(row: dict[str, Any]) -> dict[str, Decimal | None]:
    est = to_decimal(row.get("P_VALUE"))
    act = to_decimal(row.get("I_VALUE"))
    plan_issued = to_decimal(row.get("P_VALUE_WRT_ISS"))
    p_rate = to_decimal(row.get("P_RATE"))
    i_rate = to_decimal(row.get("I_RATE"))
    profit_loss = est - act if est is not None and act is not None else None
    return {
        "profit_loss_pkr": profit_loss,
        "profit_loss_pct": (profit_loss / est * HUNDRED) if profit_loss is not None and est else None,
        "plan_vs_issued_pkr": plan_issued - act if plan_issued is not None and act is not None else None,
        "rate_difference": p_rate - i_rate if p_rate is not None and i_rate is not None else None,
    }


def build_report(rows: list[dict[str, Any]]) -> Report:
    report = Report()
    manager_totals: dict[str, Decimal] = defaultdict(Decimal)
    manager_counts: dict[str, int] = defaultdict(int)
    chips = {"all": len(rows), "profit": 0, "loss": 0, "grey_complete": 0, "grey_incomplete": 0,
             "shipped": 0, "running": 0, "no_issue_cost": 0}

    for row in rows:
        po = str(row.get("CNTRCT_NO") or "")
        manager = str(row.get("MNGR") or "")
        if row.get("GREY_CLOSE_STATUS") == "CLOSE":
            chips["grey_complete"] += 1
        else:
            chips["grey_incomplete"] += 1
        if row.get("SHIPMENT_CLOSE_STATUS") == "SHIPPED":
            chips["shipped"] += 1
        else:
            chips["running"] += 1

        act = to_decimal(row.get("I_VALUE"))
        if act is None:
            chips["no_issue_cost"] += 1
        else:
            manager_totals[manager] += act
            manager_counts[manager] += 1

        pl = po_variance(row)["profit_loss_pkr"]
        if pl is None:
            continue
        if pl > 0:
            report.profit_pkr += pl
            report.profit_pos += 1
            chips["profit"] += 1
        elif pl < 0:
            report.loss_pkr += pl
            report.loss_pos += 1
            chips["loss"] += 1
        if report.biggest_saving is None or pl > report.biggest_saving.amount:
            report.biggest_saving = PoAmount(po, manager, pl)
        if pl < 0 and (report.biggest_overrun is None or pl < report.biggest_overrun.amount):
            report.biggest_overrun = PoAmount(po, manager, pl)

    report.chips = chips
    report.manager_actuals = sorted(
        ((m, total, manager_counts[m]) for m, total in manager_totals.items()),
        key=lambda item: item[1],
        reverse=True,
    )
    return report


def check_reconciles(report: Report, summary: CostSummary) -> bool:
    return report.profit_pkr + report.loss_pkr == summary.saving_pkr


def po_extremes(rows: list[dict[str, Any]]) -> tuple[PoAmount | None, PoAmount | None]:
    totals: dict[str, Decimal] = {}
    managers: dict[str, str] = {}
    for r in rows:
        est, act = to_decimal(r.get("P_VALUE")), to_decimal(r.get("I_VALUE"))
        if est is None or act is None:
            continue
        po = str(r["CNTRCT_NO"])
        totals[po] = totals.get(po, Decimal(0)) + (est - act)
        managers.setdefault(po, "")
    if not totals:
        return None, None
    best = max(totals.items(), key=lambda kv: kv[1])
    worst = min(totals.items(), key=lambda kv: kv[1])
    saving = PoAmount(best[0], managers[best[0]], best[1])
    overrun = PoAmount(worst[0], managers[worst[0]], worst[1]) if worst[1] < 0 else None
    return saving, overrun


