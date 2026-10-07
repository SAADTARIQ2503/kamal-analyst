from app.cut_to_pack_service import _normalise
from app.report import po_extremes


def test_biggest_saving_and_overrun_are_per_po_totals():
    rows = [
        _normalise({"CNTRCT_NO": "A", "PACK_SET_PRE_AMNT": 100, "PACK_SET_POST_AMNT": 10}),
        _normalise({"CNTRCT_NO": "A", "PACK_SET_PRE_AMNT": 100, "PACK_SET_POST_AMNT": 20}),
        _normalise({"CNTRCT_NO": "B", "PACK_SET_PRE_AMNT": 50, "PACK_SET_POST_AMNT": 80}),
    ]
    saving, overrun = po_extremes(rows)
    assert saving.po == "A" and saving.amount == 170
    assert overrun.po == "B" and overrun.amount == -30
