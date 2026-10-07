from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Iterable


def to_decimal(value: Any) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(value))


@dataclass(frozen=True)
class CostSummary:
    po_count: int
    estimated_pkr: Decimal
    actual_pkr: Decimal
    saving_pkr: Decimal
    over_budget: int
    within_budget: int
    under_budget: int
    unknown: int


def summarise_costs(rows: Iterable[dict[str, Any]]) -> CostSummary:
    """Every figure comes from the same row set. Rows with a null estimate or actual are counted as unknown."""
    po_count = 0
    estimated = Decimal(0)
    actual = Decimal(0)
    over = within = under = unknown = 0
    for row in rows:
        po_count += 1
        est = to_decimal(row.get("P_VALUE"))
        act = to_decimal(row.get("I_VALUE"))
        if est is None or act is None:
            unknown += 1
            continue
        estimated += est
        actual += act
        if act > est:
            over += 1
        elif act == est:
            within += 1
        else:
            under += 1
    return CostSummary(
        po_count=po_count,
        estimated_pkr=estimated,
        actual_pkr=actual,
        saving_pkr=estimated - actual,
        over_budget=over,
        within_budget=within,
        under_budget=under,
        unknown=unknown,
    )
