from datetime import date
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=1, max_length=256)


class MeResponse(BaseModel):
    username: str


class CostSummaryOut(BaseModel):
    po_count: int
    estimated_pkr: Decimal
    actual_pkr: Decimal
    saving_pkr: Decimal
    over_budget: int
    within_budget: int
    under_budget: int
    unknown: int


class GreyFiltersIn(BaseModel):
    from_date: date | None = None
    to_date: date | None = None
    po: str | None = Field(default=None, max_length=64)
    manager: str | None = Field(default=None, max_length=64)
    order_type: str | None = Field(default=None, max_length=64)
    grey_status: str | None = Field(default=None, max_length=64)
    shipment_status: str | None = Field(default=None, max_length=64)
    shipment_close_date: date | None = None

    @field_validator("*", mode="before")
    @classmethod
    def _blank_is_none(cls, value):
        if isinstance(value, str) and not value.strip():
            return None
        return value


class PoAmountOut(BaseModel):
    po: str
    manager: str
    amount_pkr: str


class ManagerTotalOut(BaseModel):
    manager: str
    actual_pkr: str
    po_count: int


class ReportOut(BaseModel):
    profit_pkr: str
    profit_pos: int
    loss_pkr: str
    loss_pos: int
    biggest_saving: PoAmountOut | None
    biggest_overrun: PoAmountOut | None
    chips: dict[str, int]
    manager_actuals: list[ManagerTotalOut]


class ProcessFiltersIn(BaseModel):
    from_date: date | None = None
    to_date: date | None = None
    po: str | None = Field(default=None, max_length=64)
    manager: str | None = Field(default=None, max_length=64)
    process: str | None = Field(default=None, max_length=128)
    party_type: Literal["in_house", "commercial"] | None = None

    @field_validator("*", mode="before")
    @classmethod
    def _blank_is_none(cls, value):
        if isinstance(value, str) and not value.strip():
            return None
        return value


class CutFiltersIn(BaseModel):
    po: str | None = Field(default=None, max_length=64)

    @field_validator("*", mode="before")
    @classmethod
    def _blank_is_none(cls, value):
        if isinstance(value, str) and not value.strip():
            return None
        return value


class GreyIssuanceResponse(BaseModel):
    columns: list[str]
    rows: list[dict[str, Any]]
    options: dict[str, list[str]]
    summary: CostSummaryOut
    total_rows: int
    excluded_rows: int
    confidence_pct: int | None
    period_start: date | None
    period_end: date | None
    report: ReportOut
    row_limit_reached: bool


class ActionOut(BaseModel):
    priority: str
    title: str
    detail: str


class SummaryOut(BaseModel):
    headline: str
    actions: list[ActionOut]


class AskIn(BaseModel):
    question: str = Field(min_length=3, max_length=300)
    filters: dict[str, Any] = {}


class AskOut(BaseModel):
    answer: str


class QueryRequest(BaseModel):
    sql: str = Field(min_length=1, max_length=10_000)


class QueryResponse(BaseModel):
    columns: list[str]
    rows: list[list[Any]]
    row_limit_reached: bool


class HealthResponse(BaseModel):
    status: str
    as_of: date


class StageSummaryOut(BaseModel):
    key: str
    label: str
    lines: int
    comparable: int
    estimated_pkr: str
    actual_pkr: str
    saving_pkr: str
    over_budget: int
    under_budget: int


class LifecycleOut(BaseModel):
    po: str
    stages: list[StageSummaryOut]


class MonthOut(BaseModel):
    month: str
    po_count: int
    estimated_pkr: str
    actual_pkr: str
    saving_pkr: str


class TrendOut(BaseModel):
    months: list[MonthOut]


class ViewIn(BaseModel):
    page: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=60)
    filters: dict[str, str] = Field(default_factory=dict, max_length=12)


class ViewOut(BaseModel):
    id: int
    name: str
    filters: dict[str, str]


class StageTotalsOut(BaseModel):
    key: str
    label: str
    lines: int
    comparable: int
    unknown: int
    estimated_pkr: str
    actual_pkr: str
    saving_pkr: str
    over_budget: int
    under_budget: int
    within_budget: int


class DashboardOut(BaseModel):
    as_of: str
    stages: list[StageTotalsOut]
    total_estimated_pkr: str
    total_actual_pkr: str
    total_saving_pkr: str


class PoOptionsOut(BaseModel):
    pos: list[str]
