import { lazy, Suspense, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { apiRequest } from "@/lib/api";
import { greyIssuanceSchema, type GreyIssuance } from "@/lib/schemas";
import { SqlEditor } from "./SqlEditor";
import { FilterChips } from "@/components/app/FilterChips";
import { toActive } from "./activeFilters";

const GREY_FILTER_LABELS = {
  from_date: "From",
  to_date: "To",
  po: "PO",
  manager: "Manager",
  order_type: "Order type",
  grey_status: "Grey status",
  shipment_status: "Shipment status",
  shipment_close_date: "Shipment close date",
};
import { BottomLine } from "./BottomLine";
import { KpiStrip } from "@/components/app/KpiStrip";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { SavedViews } from "./SavedViews";
import { ExecutiveReport } from "./ExecutiveReport";
import { PoTable } from "./PoTable";
import { ProfitLoss, GREY_CHIPS } from "./ProfitLoss";
import { GREY_COLUMNS, greyDetailFields } from "./greyColumns";
import { SUM_FIELDS } from "./groupRows";
import { emptyFilters, filterSchema, toQuery, type GreyFilterValues } from "./filters";

const ManagerChart = lazy(() => import("./ManagerChart"));
const MonthlyTrend = lazy(() => import("./MonthlyTrend"));

function dateRange(start: string | null, end: string | null): string {
  if (!start || !end) return "no dates";
  return `${start} to ${end}`;
}

function FilterBar({ value, options, onApply, onReset, onDraft, busy }: { value: GreyFilterValues; options: GreyIssuance["options"] | undefined; onApply: (v: GreyFilterValues) => void; onReset: () => void; onDraft: (v: GreyFilterValues) => void; busy: boolean }) {
  const form = useForm<GreyFilterValues>({ resolver: zodResolver(filterSchema), defaultValues: value });
  const errors = form.formState.errors;
  useEffect(() => {
    form.reset(value);
  }, [value, form]);
  useEffect(() => {
    const sub = form.watch((v) => onDraft(v as GreyFilterValues));
    return () => sub.unsubscribe();
  }, [form, onDraft]);

  const select = (id: keyof GreyFilterValues, label: string, list: string[] | undefined) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} {...form.register(id)}>
        <option value="">All</option>
        {(list ?? []).map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </Select>
    </div>
  );

  return (
    <form className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 xl:grid-cols-4" onSubmit={form.handleSubmit(onApply)} noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="from_date">From</Label>
        <Input id="from_date" type="date" {...form.register("from_date")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="to_date">To</Label>
        <Input id="to_date" type="date" aria-invalid={!!errors.to_date} {...form.register("to_date")} />
        {errors.to_date && <p className="text-xs text-destructive">{errors.to_date.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="po">PO</Label>
        <Select id="po" {...form.register("po")}>
          <option value="">All</option>
          {(options?.po ?? []).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </Select>
      </div>
      {select("manager", "Manager", options?.manager)}
      {select("order_type", "Order type", options?.order_type)}
      {select("grey_status", "Grey status", options?.grey_status)}
      {select("shipment_status", "Shipment status", options?.shipment_status)}
      {select("shipment_close_date", "Shipment close date", options?.shipment_close_date)}
      <div className="flex gap-2 sm:col-span-2 xl:col-span-1 xl:justify-end">
        <Button type="button" variant="outline" onClick={onReset} disabled={busy}>
          Reset
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Loading" : "Apply"}
        </Button>
      </div>
    </form>
  );
}

export function GreyIssuancePage() {
  const [applied, setApplied] = useState<GreyFilterValues>(emptyFilters);
  const [draft, setDraft] = useState<GreyFilterValues>(emptyFilters);
  const [chip, setChip] = useState<string>("all");

  const query = useQuery({
    queryKey: ["costing", "grey-issuance", applied],
    queryFn: () => apiRequest(`/costing/grey-issuance${toQuery(applied)}`, greyIssuanceSchema),
    placeholderData: keepPreviousData,
  });
  const data = query.data;
  const filtersActive = Object.values(applied).some(Boolean);

  const viewPo = (po: string) => {
    setApplied({ ...applied, po });
    setChip("all");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Costing: estimated vs actual</h1>
          <p className="text-sm text-muted-foreground">Grey issuance, PKR, one row per PO</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          Print
        </Button>
      </header>

      <FilterChips
        filters={toActive(applied, GREY_FILTER_LABELS)}
        onRemove={(key) => setApplied({ ...applied, [key]: "" })}
        onClear={() => setApplied(emptyFilters)}
      />

      <SavedViews page="grey" filters={draft} onApply={(f) => { const next = { ...emptyFilters, ...f }; setApplied(next); setDraft(next); setChip("all"); }} />

      <Card className="gap-0 py-0">
        <CardContent className="py-4">
          <FilterBar
            value={applied}
            onDraft={setDraft}
            options={data?.options}
            busy={query.isFetching}
            onApply={(v) => {
              setApplied(v);
              setChip("all");
            }}
            onReset={() => {
              setApplied(emptyFilters);
              setChip("all");
            }}
          />
        </CardContent>
      </Card>

      {query.isError && (
        <p role="alert" className="text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : "The costing data did not load."}
        </p>
      )}
      {query.isPending && <PageSkeleton label="Loading grey issuance" />}

      {data && (
        <>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground tabular">
            <p>
              {filtersActive
                ? `${data.summary.po_count} of ${data.total_rows} POs shown, ${data.excluded_rows} excluded by the filters.`
                : `${data.total_rows} POs shown, none excluded.`}
            </p>
            <p>Grey close dates {dateRange(data.period_start, data.period_end)}</p>
          </div>

          <KpiStrip saving={data.summary.saving_pkr} estimated={data.summary.estimated_pkr} actual={data.summary.actual_pkr} over={data.summary.over_budget} under={data.summary.under_budget} />
          <section aria-labelledby="bottom-heading" className="flex flex-col gap-4">
            <h2 id="bottom-heading" className="text-lg font-semibold">Bottom line vs estimate</h2>
            {data.row_limit_reached && <p className="text-sm text-destructive">Only the first rows are shown. Narrow the filters.</p>}
            <BottomLine data={data} onView={viewPo} />
          </section>

          <section aria-labelledby="pl-heading" className="flex flex-col gap-4">
            <h2 id="pl-heading" className="text-lg font-semibold">Profit and loss by PO</h2>
            <ProfitLoss summary={data.summary} report={data.report} chips={GREY_CHIPS} chip={chip} onChip={setChip} />
          </section>

          <section aria-labelledby="table-heading" className="flex flex-col gap-3">
            <h2 id="table-heading" className="text-lg font-semibold">POs by customer</h2>
            <PoTable rows={data.rows} chip={chip} columns={GREY_COLUMNS} sumFields={SUM_FIELDS} label="Costing by PO" detailTitle={(r) => String(r.CNTRCT_NO)} detailFields={greyDetailFields} />
          </section>

          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading chart.</p>}>
            <ManagerChart data={data} />
          </Suspense>

          <Suspense fallback={<PageSkeleton label="Loading trend" />}>
            <MonthlyTrend base="/costing/grey-issuance" filters={applied} />
          </Suspense>

          <ExecutiveReport data={data} filters={applied} onView={viewPo} base="/costing/grey-issuance" />
        </>
      )}

      <SqlEditor />
    </div>
  );
}
