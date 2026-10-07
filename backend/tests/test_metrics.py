from decimal import Decimal

from app.metrics import summarise_costs


def test_saving_equals_estimated_minus_actual():
    rows = [
        {"P_VALUE": 100, "I_VALUE": 80},
        {"P_VALUE": 50, "I_VALUE": 70},
    ]
    s = summarise_costs(rows)
    assert s.estimated_pkr == Decimal("150")
    assert s.actual_pkr == Decimal("150")
    assert s.saving_pkr == s.estimated_pkr - s.actual_pkr == Decimal("0")
    assert (s.over_budget, s.within_budget, s.under_budget) == (1, 0, 1)


def test_null_rows_are_counted_not_dropped():
    rows = [
        {"P_VALUE": 100, "I_VALUE": None},
        {"P_VALUE": None, "I_VALUE": 10},
        {"P_VALUE": 100, "I_VALUE": 40},
    ]
    s = summarise_costs(rows)
    assert s.po_count == 3
    assert s.unknown == 2
    assert s.estimated_pkr == Decimal("100")
    assert s.saving_pkr == Decimal("60")
    assert s.over_budget + s.within_budget + s.under_budget + s.unknown == s.po_count


def test_empty_input_is_zero_not_unknown():
    s = summarise_costs([])
    assert s.po_count == 0
    assert s.saving_pkr == Decimal("0")
