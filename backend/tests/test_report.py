from decimal import Decimal

from app.metrics import summarise_costs
from app.report import build_report, check_reconciles, po_variance


def row(po, manager, est, act, status="CLOSE", ship="SHIPPED", est_iss=None, p_rate=None, i_rate=None):
    return {"CNTRCT_NO": po, "MNGR": manager, "P_VALUE": est, "I_VALUE": act, "GREY_CLOSE_STATUS": status,
            "SHIPMENT_CLOSE_STATUS": ship, "P_VALUE_WRT_ISS": est_iss, "P_RATE": p_rate, "I_RATE": i_rate}


ROWS = [
    row("KTM-1", "A", 100, 80),
    row("KTM-2", "B", 50, 70, status="RUNNING", ship="RUNNING"),
    row("KTM-3", "A", 200, None),
]


def test_variance_is_estimate_minus_actual_and_blank_when_actual_missing():
    v = po_variance(ROWS[0])
    assert v["profit_loss_pkr"] == Decimal("20")
    assert v["profit_loss_pct"] == Decimal("20")
    assert po_variance(ROWS[2])["profit_loss_pkr"] is None


def test_profit_plus_loss_equals_net_saving():
    report = build_report(ROWS)
    summary = summarise_costs(ROWS)
    assert report.profit_pkr == Decimal("20")
    assert report.loss_pkr == Decimal("-20")
    assert check_reconciles(report, summary)


def test_biggest_saving_and_overrun_are_named():
    report = build_report(ROWS)
    assert report.biggest_saving.po == "KTM-1"
    assert report.biggest_overrun.po == "KTM-2"


def test_status_chips_count_every_po():
    chips = build_report(ROWS).chips
    assert chips["all"] == 3
    assert chips["grey_complete"] + chips["grey_incomplete"] == 3
    assert chips["no_issue_cost"] == 1
    assert chips["profit"] == 1 and chips["loss"] == 1


def test_manager_totals_sum_actuals():
    report = build_report(ROWS)
    totals = {m: t for m, t, _ in report.manager_actuals}
    assert totals == {"A": Decimal("80"), "B": Decimal("70")}
