from contextlib import asynccontextmanager
from datetime import date
from decimal import Decimal
from typing import Any, Literal

import oracledb
import structlog
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.sessions import SessionMiddleware
from starlette.staticfiles import StaticFiles

from app import db
from app.auth import SESSION_USER, require_user, verify_credentials
from app.config import PROJECT_DIR, Settings, get_settings
from app.ai_summary import AISummaryError, answer, summarise
from app.grey_service import GreyFilters, GreyResult, load_grey
from app.process_service import ProcessFilters, load_processing
from app.cut_to_pack_service import CutFilters, load_cut_to_pack
from app.yarn_service import YarnFilters, load_yarn
from app.knitting_service import KnitFilters, load_knitting
from app.schemas import LifecycleOut, MonthOut, StageSummaryOut, TrendOut
from app.trend import iso_date, monthly
from app import store
from app.cache import remember
from app.schemas import DashboardOut, PoOptionsOut, StageTotalsOut, ViewIn, ViewOut
from app.report import po_variance
from app.schemas import (
    CostSummaryOut,
    ActionOut,
    AskIn,
    AskOut,
    CostSummaryOut,
    GreyFiltersIn,
    ProcessFiltersIn,
    CutFiltersIn,
    ManagerTotalOut,
    PoAmountOut,
    ReportOut,
    GreyIssuanceResponse,
    HealthResponse,
    LoginRequest,
    MeResponse,
    QueryRequest,
    QueryResponse,
    SummaryOut,
)
from app.sql_guard import UnsafeSqlError

log = structlog.get_logger()


def _json_safe(value: Any) -> Any:
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, date):
        return value.isoformat()
    return value


class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            is_route = not path.startswith("api") and "." not in path.rsplit("/", 1)[-1]
            if exc.status_code != 404 or not is_route:
                raise
            return await super().get_response("index.html", scope)


def _money_or_none(value):
    return None if value is None else str(value)


def _po_out(item):
    return None if item is None else PoAmountOut(po=item.po, manager=item.manager, amount_pkr=str(item.amount))


def _report_out(report) -> ReportOut:
    return ReportOut(
        profit_pkr=str(report.profit_pkr),
        profit_pos=report.profit_pos,
        loss_pkr=str(report.loss_pkr),
        loss_pos=report.loss_pos,
        biggest_saving=_po_out(report.biggest_saving),
        biggest_overrun=_po_out(report.biggest_overrun),
        chips=report.chips,
        manager_actuals=[ManagerTotalOut(manager=m, actual_pkr=str(t), po_count=c) for m, t, c in report.manager_actuals],
    )


def _row_out(row: dict) -> dict:
    out = {k: _json_safe(v) for k, v in row.items()}
    variance = po_variance(row)
    out.update({k: _money_or_none(v) for k, v in variance.items()})
    return out


def _grey_response(result: GreyResult) -> GreyIssuanceResponse:
    s = result.summary
    confidence = round(100 * (s.po_count - s.unknown) / s.po_count) if s.po_count else None
    return GreyIssuanceResponse(
        columns=result.columns,
        rows=[_row_out(r) for r in result.rows],
        options=result.options,
        summary=CostSummaryOut(**s.__dict__),
        total_rows=result.total_rows,
        excluded_rows=result.excluded_rows,
        confidence_pct=confidence,
        period_start=result.period_start,
        period_end=result.period_end,
        report=_report_out(result.report),
        row_limit_reached=result.row_limit_reached,
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        db.init_pool(settings)
        yield
        db.close_pool()

    app = FastAPI(title="Kamal Analyst API", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.session_secret.get_secret_value(),
        session_cookie="kt_session",
        same_site="strict",
        https_only=settings.session_https_only,
        max_age=8 * 60 * 60,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["content-type"],
    )

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'; object-src 'none'"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Frame-Options"] = "DENY"
        if settings.session_https_only:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    @app.exception_handler(UnsafeSqlError)
    async def unsafe_sql(_: Request, exc: UnsafeSqlError):
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    @app.exception_handler(oracledb.DatabaseError)
    async def database_error(_: Request, exc: oracledb.DatabaseError):
        info = exc.args[0] if exc.args else None
        log.error("database_error", code=getattr(info, "code", None), message=getattr(info, "message", str(exc)))
        return JSONResponse(status_code=502, content={"detail": "The database did not return data. Try again."})

    @app.get("/api/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse(status="ok", as_of=date.today())

    @app.post("/api/login", response_model=MeResponse)
    def login(body: LoginRequest, request: Request) -> MeResponse:
        if not verify_credentials(settings, body.username, body.password):
            raise HTTPException(status_code=401, detail="Invalid username or password.")
        request.session.clear()
        request.session[SESSION_USER] = body.username
        return MeResponse(username=body.username)

    @app.post("/api/logout", status_code=204)
    def logout(request: Request) -> None:
        request.session.clear()

    @app.get("/api/me", response_model=MeResponse)
    def me(user: str = Depends(require_user)) -> MeResponse:
        return MeResponse(username=user)

    def _to_filters(body: GreyFiltersIn) -> GreyFilters:
        clean = {k: (v.strip() or None) if isinstance(v, str) else v for k, v in body.model_dump().items()}
        return GreyFilters(**clean)

    @app.get("/api/costing/grey-issuance", response_model=GreyIssuanceResponse)
    def grey_issuance(
        from_date: date | None = None,
        to_date: date | None = None,
        po: str | None = Query(default=None, max_length=64),
        manager: str | None = Query(default=None, max_length=64),
        order_type: str | None = Query(default=None, max_length=64),
        grey_status: str | None = Query(default=None, max_length=64),
        shipment_status: str | None = Query(default=None, max_length=64),
        shipment_close_date: date | None = None,
        user: str = Depends(require_user),
    ) -> GreyIssuanceResponse:
        f = _to_filters(GreyFiltersIn(
            from_date=from_date, to_date=to_date, po=po, manager=manager,
            order_type=order_type, grey_status=grey_status, shipment_status=shipment_status,
            shipment_close_date=shipment_close_date,
        ))
        result = load_grey(settings, f)
        return _grey_response(result)

    @app.post("/api/costing/grey-issuance/summary", response_model=SummaryOut)
    def grey_summary(body: GreyFiltersIn, user: str = Depends(require_user)) -> SummaryOut:
        result = load_grey(settings, _to_filters(body))
        try:
            text = summarise(settings, result)
        except AISummaryError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        return SummaryOut(
            headline=text.headline,
            actions=[ActionOut(priority=a.priority, title=a.title, detail=a.detail) for a in text.actions],
        )

    @app.post("/api/costing/grey-issuance/ask", response_model=AskOut)
    def grey_ask(body: AskIn, user: str = Depends(require_user)) -> AskOut:
        result = load_grey(settings, _to_filters(GreyFiltersIn(**body.filters)))
        try:
            text = answer(settings, result, body.question.strip())
        except AISummaryError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        return AskOut(answer=text.answer)

    def _to_process_filters(body: ProcessFiltersIn) -> ProcessFilters:
        clean = {k: (v.strip() or None) if isinstance(v, str) else v for k, v in body.model_dump().items()}
        return ProcessFilters(**clean)

    @app.get("/api/costing/processing", response_model=GreyIssuanceResponse)
    def processing(
        from_date: date | None = None,
        to_date: date | None = None,
        po: str | None = Query(default=None, max_length=64),
        manager: str | None = Query(default=None, max_length=64),
        process: str | None = Query(default=None, max_length=128),
        party_type: Literal["in_house", "commercial"] | None = None,
        user: str = Depends(require_user),
    ) -> GreyIssuanceResponse:
        f = _to_process_filters(ProcessFiltersIn(
            from_date=from_date, to_date=to_date, po=po, manager=manager, process=process, party_type=party_type,
        ))
        return _grey_response(load_processing(settings, f))

    @app.post("/api/costing/processing/summary", response_model=SummaryOut)
    def processing_summary(body: ProcessFiltersIn, user: str = Depends(require_user)) -> SummaryOut:
        result = load_processing(settings, _to_process_filters(body))
        try:
            text = summarise(settings, result)
        except AISummaryError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        return SummaryOut(
            headline=text.headline,
            actions=[ActionOut(priority=a.priority, title=a.title, detail=a.detail) for a in text.actions],
        )

    @app.post("/api/costing/processing/ask", response_model=AskOut)
    def processing_ask(body: AskIn, user: str = Depends(require_user)) -> AskOut:
        result = load_processing(settings, _to_process_filters(ProcessFiltersIn(**body.filters)))
        try:
            text = answer(settings, result, body.question.strip())
        except AISummaryError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        return AskOut(answer=text.answer)

    @app.get("/api/costing/cut-to-pack", response_model=GreyIssuanceResponse)
    def cut_to_pack(po: str | None = Query(default=None, max_length=64), user: str = Depends(require_user)) -> GreyIssuanceResponse:
        f = CutFilters(po=CutFiltersIn(po=po).po)
        return _grey_response(load_cut_to_pack(settings, f))

    @app.post("/api/costing/cut-to-pack/summary", response_model=SummaryOut)
    def cut_to_pack_summary(body: CutFiltersIn, user: str = Depends(require_user)) -> SummaryOut:
        result = load_cut_to_pack(settings, CutFilters(po=body.po))
        try:
            text = summarise(settings, result)
        except AISummaryError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        return SummaryOut(
            headline=text.headline,
            actions=[ActionOut(priority=a.priority, title=a.title, detail=a.detail) for a in text.actions],
        )

    @app.post("/api/costing/cut-to-pack/ask", response_model=AskOut)
    def cut_to_pack_ask(body: AskIn, user: str = Depends(require_user)) -> AskOut:
        result = load_cut_to_pack(settings, CutFilters(po=CutFiltersIn(**body.filters).po))
        try:
            text = answer(settings, result, body.question.strip())
        except AISummaryError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        return AskOut(answer=text.answer)

    @app.get("/api/garments/yarn", response_model=GreyIssuanceResponse)
    def yarn(po: str | None = Query(default=None, max_length=64), user: str = Depends(require_user)) -> GreyIssuanceResponse:
        return _grey_response(load_yarn(settings, YarnFilters(po=CutFiltersIn(po=po).po)))

    @app.post("/api/garments/yarn/summary", response_model=SummaryOut)
    def yarn_summary(body: CutFiltersIn, user: str = Depends(require_user)) -> SummaryOut:
        result = load_yarn(settings, YarnFilters(po=body.po))
        try:
            text = summarise(settings, result)
        except AISummaryError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        return SummaryOut(
            headline=text.headline,
            actions=[ActionOut(priority=a.priority, title=a.title, detail=a.detail) for a in text.actions],
        )

    @app.post("/api/garments/yarn/ask", response_model=AskOut)
    def yarn_ask(body: AskIn, user: str = Depends(require_user)) -> AskOut:
        result = load_yarn(settings, YarnFilters(po=CutFiltersIn(**body.filters).po))
        try:
            text = answer(settings, result, body.question.strip())
        except AISummaryError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        return AskOut(answer=text.answer)

    @app.get("/api/garments/knitting", response_model=GreyIssuanceResponse)
    def knitting(po: str | None = Query(default=None, max_length=64), user: str = Depends(require_user)) -> GreyIssuanceResponse:
        return _grey_response(load_knitting(settings, KnitFilters(po=CutFiltersIn(po=po).po)))

    @app.post("/api/garments/knitting/summary", response_model=SummaryOut)
    def knitting_summary(body: CutFiltersIn, user: str = Depends(require_user)) -> SummaryOut:
        result = load_knitting(settings, KnitFilters(po=body.po))
        try:
            text = summarise(settings, result)
        except AISummaryError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        return SummaryOut(
            headline=text.headline,
            actions=[ActionOut(priority=a.priority, title=a.title, detail=a.detail) for a in text.actions],
        )

    @app.post("/api/garments/knitting/ask", response_model=AskOut)
    def knitting_ask(body: AskIn, user: str = Depends(require_user)) -> AskOut:
        result = load_knitting(settings, KnitFilters(po=CutFiltersIn(**body.filters).po))
        try:
            text = answer(settings, result, body.question.strip())
        except AISummaryError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        return AskOut(answer=text.answer)

    @app.get("/api/po/{po}/lifecycle", response_model=LifecycleOut)
    def po_lifecycle(po: str, user: str = Depends(require_user)) -> LifecycleOut:
        code = po.strip()[:64]
        loaders = [
            ("grey", "Grey issuance", lambda: load_grey(settings, GreyFilters(po=code))),
            ("processing", "Processing", lambda: load_processing(settings, ProcessFilters(po=code))),
            ("cut_to_pack", "Cut to pack", lambda: load_cut_to_pack(settings, CutFilters(po=code))),
            ("yarn", "Yarn purchase", lambda: load_yarn(settings, YarnFilters(po=code))),
            ("knitting", "Knitting", lambda: load_knitting(settings, KnitFilters(po=code))),
        ]
        stages = []
        for key, label, load in loaders:
            result = load()
            sm = result.summary
            stages.append(StageSummaryOut(
                key=key,
                label=label,
                lines=len(result.rows),
                comparable=sm.po_count - sm.unknown,
                estimated_pkr=str(sm.estimated_pkr),
                actual_pkr=str(sm.actual_pkr),
                saving_pkr=str(sm.saving_pkr),
                over_budget=sm.over_budget,
                under_budget=sm.under_budget,
            ))
        return LifecycleOut(po=code, stages=stages)

    @app.post("/api/costing/grey-issuance/trend", response_model=TrendOut)
    def grey_trend(body: GreyFiltersIn, user: str = Depends(require_user)) -> TrendOut:
        result = load_grey(settings, _to_filters(body))
        months = monthly(result.rows, lambda r: iso_date(r.get("GREY_CLOSE_DATE")))
        return TrendOut(months=[MonthOut(**m) for m in months])

    @app.post("/api/costing/processing/trend", response_model=TrendOut)
    def processing_trend(body: ProcessFiltersIn, user: str = Depends(require_user)) -> TrendOut:
        result = load_processing(settings, _to_process_filters(body))
        months = monthly(result.rows, lambda r: iso_date(r.get("LOT_COST_DATE")))
        return TrendOut(months=[MonthOut(**m) for m in months])

    @app.get("/api/views", response_model=list[ViewOut])
    def list_saved_views(page: str = Query(max_length=32), user: str = Depends(require_user)) -> list[ViewOut]:
        if page not in store.PAGES:
            raise HTTPException(status_code=400, detail="Unknown page.")
        return [ViewOut(**v) for v in store.list_views(user, page)]

    @app.post("/api/views", response_model=ViewOut, status_code=201)
    def create_saved_view(body: ViewIn, user: str = Depends(require_user)) -> ViewOut:
        if body.page not in store.PAGES:
            raise HTTPException(status_code=400, detail="Unknown page.")
        clean = {k: v.strip() for k, v in body.filters.items() if v and v.strip() and len(k) <= 40}
        return ViewOut(**store.add_view(user, body.page, body.name.strip(), clean))

    @app.delete("/api/views/{view_id}", status_code=204)
    def delete_saved_view(view_id: int, user: str = Depends(require_user)) -> None:
        if not store.delete_view(user, view_id):
            raise HTTPException(status_code=404, detail="View not found.")

    def _stage_loaders():
        return [
            ("grey", "Grey issuance", lambda f: load_grey(settings, GreyFilters(po=f))),
            ("processing", "Processing", lambda f: load_processing(settings, ProcessFilters(po=f))),
            ("cut_to_pack", "Cut to pack", lambda f: load_cut_to_pack(settings, CutFilters(po=f))),
            ("yarn", "Yarn purchase", lambda f: load_yarn(settings, YarnFilters(po=f))),
            ("knitting", "Knitting", lambda f: load_knitting(settings, KnitFilters(po=f))),
        ]

    def _all_pos() -> list[str]:
        found: set[str] = set()
        for _, _, load in _stage_loaders():
            found.update(load(None).options.get("po", []))
        return sorted(found)

    @app.get("/api/po/options", response_model=PoOptionsOut)
    def po_options(user: str = Depends(require_user)) -> PoOptionsOut:
        return PoOptionsOut(pos=remember("po_options", 300, _all_pos))

    @app.get("/api/dashboard", response_model=DashboardOut)
    def dashboard(user: str = Depends(require_user)) -> DashboardOut:
        def build() -> DashboardOut:
            from datetime import datetime, timezone
            stages = []
            for key, label, load in _stage_loaders():
                result = load(None)
                sm = result.summary
                stages.append(StageTotalsOut(
                    key=key, label=label, lines=len(result.rows), comparable=sm.po_count - sm.unknown, unknown=sm.unknown,
                    estimated_pkr=str(sm.estimated_pkr), actual_pkr=str(sm.actual_pkr), saving_pkr=str(sm.saving_pkr),
                    over_budget=sm.over_budget, under_budget=sm.under_budget, within_budget=sm.within_budget,
                ))
            from decimal import Decimal
            est = sum((Decimal(s.estimated_pkr) for s in stages), Decimal(0))
            act = sum((Decimal(s.actual_pkr) for s in stages), Decimal(0))
            return DashboardOut(
                as_of=datetime.now(timezone.utc).isoformat(timespec="seconds"),
                stages=stages,
                total_estimated_pkr=str(est),
                total_actual_pkr=str(act),
                total_saving_pkr=str(est - act),
            )
        return remember("dashboard", 120, build)

    @app.post("/api/query", response_model=QueryResponse)
    def run_query(body: QueryRequest, user: str = Depends(require_user)) -> QueryResponse:
        log.info("sql_query", user=user, length=len(body.sql))
        columns, raw_rows = db.run_select(
            body.sql,
            row_limit=settings.db_row_limit,
            timeout_ms=settings.db_query_timeout_ms,
        )
        limit_hit = len(raw_rows) > settings.db_row_limit
        rows = [[_json_safe(v) for v in r] for r in raw_rows[: settings.db_row_limit]]
        return QueryResponse(columns=columns, rows=rows, row_limit_reached=limit_hit)

    dist = PROJECT_DIR / "frontend" / "dist"
    if dist.is_dir():
        app.mount("/", SPAStaticFiles(directory=dist, html=True), name="web")

    return app
