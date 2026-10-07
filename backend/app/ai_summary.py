import json
import re
import threading
from collections import OrderedDict
from dataclasses import asdict
from datetime import date
from decimal import Decimal
from typing import Any, Literal

import anthropic
from pydantic import BaseModel, Field, ValidationError

from app.config import Settings

NUMBER = re.compile(r"\d[\d,]*(?:\.\d+)?")
SUMMARY_PROMPT = (
    "You write short factual notes on textile costing for a costing department. "
    "Use only the figures in the user's JSON. Do not calculate or estimate any new figure. "
    "Plain, neutral language. No exclamation marks and no em dashes. "
    'Reply with JSON only, in this shape: {"headline": string, "actions": [{"priority": "HIGH" or "MEDIUM" or "LOW", '
    '"title": string, "detail": string}]}. Give between 1 and 3 actions, each a point to review and why.'
)
ASK_PROMPT = (
    "You answer questions about a textile costing report for a costing department. "
    "Answer only from the figures in the user's JSON. If the figures do not answer the question, say so. "
    "Do not calculate or estimate new figures. Plain language, at most four sentences. "
    'Reply with JSON only, in this shape: {"answer": string}.'
)


class AISummaryError(Exception):
    pass


class ActionItem(BaseModel):
    priority: Literal["HIGH", "MEDIUM", "LOW"]
    title: str = Field(min_length=1, max_length=120)
    detail: str = Field(min_length=1, max_length=240)

    model_config = {"extra": "forbid"}


class SummaryText(BaseModel):
    headline: str = Field(min_length=1, max_length=160)
    actions: list[ActionItem] = Field(min_length=1, max_length=3)

    model_config = {"extra": "forbid"}


class AnswerText(BaseModel):
    answer: str = Field(min_length=1, max_length=600)

    model_config = {"extra": "forbid"}


class _Limiter:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._day: date | None = None
        self._count = 0
        self._cache: OrderedDict[str, Any] = OrderedDict()

    def cached(self, key: str) -> Any | None:
        with self._lock:
            hit = self._cache.get(key)
            if hit is not None:
                self._cache.move_to_end(key)
            return hit

    def store(self, key: str, value: Any) -> None:
        with self._lock:
            self._cache[key] = value
            if len(self._cache) > 64:
                self._cache.popitem(last=False)

    def take(self, limit: int) -> bool:
        with self._lock:
            today = date.today()
            if self._day != today:
                self._day, self._count = today, 0
            if self._count >= limit:
                return False
            self._count += 1
            return True


_limiter = _Limiter()


def _money(value: Decimal | None) -> str | None:
    return None if value is None else str(value.quantize(Decimal("1")))


def build_facts(result: Any) -> dict[str, Any]:
    s = result.summary
    r = result.report
    period = None
    if result.period_start and result.period_end:
        period = f"{result.period_start.isoformat()} to {result.period_end.isoformat()}"
    applied = {}
    for key, value in asdict(result.filters).items():
        if value is None or value == "":
            continue
        applied[key] = value.isoformat() if isinstance(value, date) else value
    by_process = {k[len("process:"):]: v for k, v in r.chips.items() if k.startswith("process:")}
    facts = {
        "currency": "PKR",
        "po_count": s.po_count,
        "estimated_pkr": _money(s.estimated_pkr),
        "actual_pkr": _money(s.actual_pkr),
        "saving_pkr": _money(s.saving_pkr),
        "over_budget_pos": s.over_budget,
        "within_budget_pos": s.within_budget,
        "under_budget_pos": s.under_budget,
        "not_comparable_pos": s.unknown,
        "profit_pkr": _money(r.profit_pkr),
        "profit_pos": r.profit_pos,
        "loss_pkr": _money(r.loss_pkr),
        "loss_pos": r.loss_pos,
        "biggest_saving_po": {"po": r.biggest_saving.po, "manager": r.biggest_saving.manager, "pkr": _money(r.biggest_saving.amount)} if r.biggest_saving else None,
        "biggest_overrun_po": {"po": r.biggest_overrun.po, "manager": r.biggest_overrun.manager, "pkr": _money(r.biggest_overrun.amount)} if r.biggest_overrun else None,
        "period": period,
        "filters_applied": applied,
        "excluded_by_filters": result.excluded_rows,
    }
    if by_process:
        facts["lines_by_process"] = by_process
    return facts


def _numbers(text: str) -> set[str]:
    return {m.replace(",", "") for m in NUMBER.findall(text)}


def _check(texts: list[str], allowed: set[str]) -> None:
    for text in texts:
        if _numbers(text) - allowed:
            raise AISummaryError("The text used figures that are not in the data.")


def _client(settings: Settings) -> anthropic.Anthropic:
    return anthropic.Anthropic(
        api_key=settings.anthropic_api_key.get_secret_value(),
        timeout=settings.ai_timeout_seconds,
        max_retries=1,
    )


def _call(settings: Settings, system: str, facts: dict[str, Any], question: str | None = None) -> str:
    content = {"facts": facts} if question is None else {"facts": facts, "question": question}
    try:
        message = _client(settings).messages.create(
            model=settings.ai_model,
            max_tokens=settings.ai_max_output_tokens,
            system=system,
            messages=[{"role": "user", "content": json.dumps(content, ensure_ascii=False)}],
        )
    except anthropic.APIError as exc:
        raise AISummaryError("The summary service is unavailable.") from exc
    return "".join(block.text for block in message.content if block.type == "text")


def _parse_json(raw: str) -> dict[str, Any]:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`").removeprefix("json").strip()
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise AISummaryError("The text could not be read.") from exc
    if not isinstance(data, dict):
        raise AISummaryError("The text could not be read.")
    return data


def _take_or_fail(settings: Settings) -> None:
    if not _limiter.take(settings.ai_daily_call_limit):
        raise AISummaryError("The daily limit for written text has been reached.")


def _require_key(settings: Settings) -> None:
    if settings.anthropic_api_key is None:
        raise AISummaryError("Summary is not available right now.")


def summarise(settings: Settings, result: Any) -> SummaryText:
    _require_key(settings)
    facts = build_facts(result)
    key = "summary:" + json.dumps(facts, sort_keys=True)
    cached = _limiter.cached(key)
    if cached is not None:
        return cached
    _take_or_fail(settings)
    try:
        parsed = SummaryText.model_validate(_parse_json(_call(settings, SUMMARY_PROMPT, facts)))
    except ValidationError as exc:
        raise AISummaryError("The text could not be read.") from exc
    allowed = _numbers(json.dumps(facts))
    _check([parsed.headline] + [a.title + " " + a.detail for a in parsed.actions], allowed)
    _limiter.store(key, parsed)
    return parsed


def answer(settings: Settings, result: Any, question: str) -> AnswerText:
    _require_key(settings)
    facts = build_facts(result)
    key = "ask:" + json.dumps({"facts": facts, "q": question}, sort_keys=True)
    cached = _limiter.cached(key)
    if cached is not None:
        return cached
    _take_or_fail(settings)
    try:
        parsed = AnswerText.model_validate(_parse_json(_call(settings, ASK_PROMPT, facts, question)))
    except ValidationError as exc:
        raise AISummaryError("The answer could not be read.") from exc
    _check([parsed.answer], _numbers(json.dumps(facts)))
    _limiter.store(key, parsed)
    return parsed
