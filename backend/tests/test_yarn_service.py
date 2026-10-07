from app.yarn_service import _normalise


def test_issued_basis_and_completed_rule():
    row = _normalise({"CNTRCT_NO": "KTM-N-1", "YCOUNT": "30", "REQ_KGS": 100, "ISS_KGS": 120,
                      "PRE_RATE": 250, "POST_RATE": 260, "ISS_PRE_AMNT": 30000, "POST_AMNT": 31200})
    assert row["P_VALUE"] == 30000 and row["I_VALUE"] == 31200
    assert row["GREY_CLOSE_STATUS"] == "CLOSE"
    assert _normalise({"REQ_KGS": 100, "ISS_KGS": 50})["GREY_CLOSE_STATUS"] == "RUNNING"
