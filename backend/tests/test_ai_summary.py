import json
from decimal import Decimal
from types import SimpleNamespace

import anthropic
import pytest
from pydantic import SecretStr

from app import ai_summary
from app.config import Settings
from app.grey_service import GreyFilters, GreyResult
from app.metrics import CostSummary


def make_result(filters=None):
    from app.report import PoAmount, Report
    report = Report(
        profit_pkr=Decimal("374989813.27"), profit_pos=291, loss_pkr=Decimal("-16322640.84"), loss_pos=32,
        biggest_saving=PoAmount("KTM-11258-A", "ABID", Decimal("32474902.08")),
        biggest_overrun=PoAmount("KTM-10785-B", "MUZZAMIL", Decimal("-9127308.17")),
    )
    summary = CostSummary(
        po_count=399, estimated_pkr=Decimal("2782573751.76"), actual_pkr=Decimal("2423906579.331"),
        saving_pkr=Decimal("358667172.429"), over_budget=32, within_budget=0, under_budget=291, unknown=76,
    )
    from datetime import date
    return GreyResult(
        columns=[], rows=[], total_rows=399, excluded_rows=0, options={}, summary=summary, report=report,
        row_limit_reached=False, period_start=date(2023, 6, 15), period_end=date(2026, 10, 2),
        filters=filters or GreyFilters(),
    )


def settings_with_key(tmp_path, key="sk-test"):
    return Settings(
        db_user="u", db_password=SecretStr("p"), db_dsn="x/y", instant_client_dir=tmp_path,
        app_username="a", app_password_hash=SecretStr("h"), session_secret=SecretStr("s" * 48),
        anthropic_api_key=SecretStr(key) if key else None, _env_file=None,
    )


class FakeClient:
    reply = ""

    def __init__(self, **_):
        self.messages = SimpleNamespace(create=self._create)

    def _create(self, **_):
        return SimpleNamespace(content=[SimpleNamespace(type="text", text=FakeClient.reply)])


@pytest.fixture(autouse=True)
def fresh_limiter(monkeypatch):
    monkeypatch.setattr(ai_summary, "_limiter", ai_summary._Limiter())
    monkeypatch.setattr(ai_summary.anthropic, "Anthropic", FakeClient)


def test_summary_is_refused_without_a_key(tmp_path):
    with pytest.raises(ai_summary.AISummaryError):
        ai_summary.summarise(settings_with_key(tmp_path, key=None), make_result())


ACTION = {"priority": "HIGH", "title": "Check KTM-10785-B", "detail": "Cost 9,127,308 more than estimated."}


def test_accepts_text_that_uses_only_given_figures(tmp_path):
    FakeClient.reply = json.dumps({"headline": "Net saving of PKR 358,667,172.", "actions": [ACTION]})
    out = ai_summary.summarise(settings_with_key(tmp_path), make_result())
    assert out.actions[0].priority == "HIGH"


def test_rejects_invented_figure(tmp_path):
    FakeClient.reply = json.dumps({"headline": "Net saving of PKR 999,999,999.", "actions": [ACTION]})
    with pytest.raises(ai_summary.AISummaryError):
        ai_summary.summarise(settings_with_key(tmp_path), make_result())


def test_rejects_extra_fields_and_bad_priority(tmp_path):
    FakeClient.reply = json.dumps({"headline": "x", "actions": [{**ACTION, "priority": "URGENT"}]})
    with pytest.raises(ai_summary.AISummaryError):
        ai_summary.summarise(settings_with_key(tmp_path), make_result())


def test_daily_limit_blocks_calls(tmp_path):
    FakeClient.reply = json.dumps({"headline": "Net saving of PKR 358,667,172.", "actions": [ACTION]})
    s = settings_with_key(tmp_path)
    s = s.model_copy(update={"ai_daily_call_limit": 1})
    ai_summary.summarise(s, make_result())
    with pytest.raises(ai_summary.AISummaryError):
        ai_summary.summarise(s, make_result(GreyFilters(po="KTM-1")))


def test_identical_request_is_served_from_cache(tmp_path):
    FakeClient.reply = json.dumps({"headline": "Net saving of PKR 358,667,172.", "actions": [ACTION]})
    s = settings_with_key(tmp_path).model_copy(update={"ai_daily_call_limit": 1})
    first = ai_summary.summarise(s, make_result())
    FakeClient.reply = "not json"
    assert ai_summary.summarise(s, make_result()) == first


def test_question_answer_is_checked_against_figures(tmp_path):
    FakeClient.reply = json.dumps({"answer": "There were 291 under budget POs."})
    out = ai_summary.answer(settings_with_key(tmp_path), make_result(), "How many POs were under budget?")
    assert "291" in out.answer
    FakeClient.reply = json.dumps({"answer": "There were 5000 POs."})
    with pytest.raises(ai_summary.AISummaryError):
        ai_summary.answer(settings_with_key(tmp_path), make_result(), "How many?")
