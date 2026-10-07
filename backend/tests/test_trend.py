from datetime import date

from app.trend import monthly


def test_monthly_buckets_add_up_and_skip_unknown_dates():
    rows = [
        {"P_VALUE": 100, "I_VALUE": 80, "d": date(2026, 1, 5)},
        {"P_VALUE": 50, "I_VALUE": 60, "d": date(2026, 1, 20)},
        {"P_VALUE": 10, "I_VALUE": 5, "d": date(2026, 2, 1)},
        {"P_VALUE": 99, "I_VALUE": 1, "d": None},
    ]
    out = monthly(rows, lambda r: r["d"])
    assert [m["month"] for m in out] == ["2026-01", "2026-02"]
    assert out[0]["saving_pkr"] == "10" and out[0]["po_count"] == 2
    assert out[1]["saving_pkr"] == "5"
