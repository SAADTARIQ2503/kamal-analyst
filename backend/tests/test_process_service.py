from datetime import date

from app.process_service import ProcessFilters, _matches, _normalise, _party


def line(**kw):
    base = {"CNTRCT_NO": "CPO-1", "PRCS": "Flat Bed", "MNGR_ID": "7", "PARTY_ID": 0, "LOT_COST_DATE": "2026-09-25T00:00:00",
            "PRE_COST_AMNT": 100, "POST_COST_AMNT": 80}
    return {**base, **kw}


def test_party_zero_is_in_house_and_other_values_are_commercial():
    assert _party(line(PARTY_ID=0)) == "in_house"
    assert _party(line(PARTY_ID=1080)) == "commercial"


def test_filters_match_process_party_and_date():
    row = _normalise(line())
    assert _matches(row, ProcessFilters(process="Flat Bed", party_type="in_house"))
    assert not _matches(row, ProcessFilters(process="Bleach"))
    assert not _matches(row, ProcessFilters(party_type="commercial"))
    assert _matches(row, ProcessFilters(from_date=date(2026, 9, 1), to_date=date(2026, 9, 30)))


def test_estimate_and_actual_come_from_pre_and_post_cost():
    row = _normalise(line())
    assert row["P_VALUE"] == 100 and row["I_VALUE"] == 80
