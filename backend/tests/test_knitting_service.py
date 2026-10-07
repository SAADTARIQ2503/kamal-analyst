from app.knitting_service import _normalise


def test_knit_amounts_and_no_issue_cost_chip_rule():
    row = _normalise({"CNTRCT_NO": "KTM-N-9", "REQ_KGS": 100, "KNIT_KGS": 120, "PRE_AMNT": 1000, "POST_AMNT": 1100})
    assert row["P_VALUE"] == 1000 and row["I_VALUE"] == 1100
    assert row["GREY_CLOSE_STATUS"] == "CLOSE"
