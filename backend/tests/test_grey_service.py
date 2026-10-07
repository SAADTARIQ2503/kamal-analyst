from datetime import date

from app.grey_service import GreyFilters, _matches

ROW = {"CNTRCT_NO": "KTM-11208", "MNGR": "ABID", "SO_TYPE": "SALE_ORDER", "GREY_CLOSE_STATUS": "CLOSE",
       "SHIPMENT_CLOSE_STATUS": "SHIPPED", "GREY_CLOSE_DATE": "2026-06-15"}


def test_no_filters_keeps_every_row():
    assert _matches(ROW, GreyFilters())


def test_each_text_filter_must_match_exactly_or_by_substring_for_po():
    assert _matches(ROW, GreyFilters(po="112"))
    assert not _matches(ROW, GreyFilters(manager="OTHER"))
    assert not _matches(ROW, GreyFilters(grey_status="RUNNING"))
    assert _matches(ROW, GreyFilters(manager="ABID", shipment_status="SHIPPED"))


def test_date_range_is_inclusive_and_excludes_rows_without_a_date():
    assert _matches(ROW, GreyFilters(from_date=date(2026, 6, 15), to_date=date(2026, 6, 15)))
    assert not _matches(ROW, GreyFilters(from_date=date(2026, 6, 16)))
    assert not _matches({**ROW, "GREY_CLOSE_DATE": None}, GreyFilters(from_date=date(2026, 1, 1)))


def test_shipment_close_date_matches_only_that_day():
    shipped = {**ROW, "SHIPMENT_CLOSE_DATE": "2026-08-03T00:00:00"}
    assert _matches(shipped, GreyFilters(shipment_close_date=date(2026, 8, 3)))
    assert not _matches(shipped, GreyFilters(shipment_close_date=date(2026, 8, 4)))
    assert not _matches(ROW, GreyFilters(shipment_close_date=date(2026, 8, 3)))
