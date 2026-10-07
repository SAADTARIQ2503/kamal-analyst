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
import { BottomLine } from "./BottomLine";
import { KpiStrip } from "@/components/app/KpiStrip";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { SavedViews } from "./SavedViews";
import { ExecutiveReport } from "./ExecutiveReport";
import { PoTable } from "./PoTable";
import { processChips, ProfitLoss } from "./ProfitLoss";
import { PROCESS_COLUMNS, processDetailFields } from "./processColumns";
import { PROCESS_SUM_FIELDS } from "./groupRows";
import { SqlEditor } from "./SqlEditor";
import { FilterChips } from "@/components/app/FilterChips";
import { toActive } from "./activeFilters";

const PROCESS_FILTER_LABELS = {
  from_date: "From",
  to_date: "To",
  po: "PO",
  manager: "Manager",
  process: "Process",
  party_type: "Type",
};
import { emptyProcessFilters, processFilterSchema, processQuery, type ProcessFilterValues } from "./processFilters";

const ManagerChart = lazy(() => import("./ManagerChart"));
const MonthlyTrend = lazy(() => import("./MonthlyTrend"));

function ProcessFilterBar({ value, options, busy, onApply, onReset, onDraft }: { value: ProcessFilterValues; options: GreyIssuance["options"] | undefined; busy: boolean; onApply: (v: ProcessFilterValues) => void; onReset: () => void; onDraft: (v: ProcessFilterValues) => void }) {
  const form = useForm<ProcessFilterValues>({ resolver: zodResolver(processFilterSchema), defaultValues: value });
  const errors = form.formState.errors;
  useEffect(() => {
    form.reset(value);
  }, [value, form]);
  useEffect(() => {
    const sub = form.watch((v) => onDraft(v as ProcessFilterValues));
    return () => sub.unsubscribe();
  }, [form, onDraft]);

  return (
    <form className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 xl:grid-cols-4" onSubmit={form.handleSubmit(onApply)} noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p_from">From</Label>
        <Input id="p_from" type="date" {...form.register("from_date")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p_to">To</Label>
        <Input id="p_to" type="date" aria-invalid={!!errors.to_date} {...form.register("to_date")} />
        {errors.to_date && <p className="text-xs text-destructive">{errors.to_date.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p_po">PO</Label>
        <Select id="p_po" {...form.register("po")}>
          <option value="">All</option>
          {(options?.po ?? []).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p_manager">Manager</Label>
        <Select id="p_manager" {...form.register("manager")}>
          <option value="">All</option>
          {(options?.manager ?? []).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p_process">Process</Label>
        <Select id="p_process" {...form.register("process")}>
          <option value="">All</option>
          {(options?.process ?? []).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p_party">Type</Label>
        <Select id="p_party" {...form.register("party_type")}>
          <option value="">All</option>
          <option value="in_house">In-house</option>
          <option value="commercial">Commercial</option>
        </Select>
      </div>
      <div className="flex gap-2 sm:col-span-2 xl:col-span-2 xl:justify-end">
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

export function ProcessingPage() {
  const [applied, setApplied] = useState<ProcessFilterValues>(emptyProcessFilters);
  const [draft, setDraft] = useState<ProcessFilterValues>(emptyProcessFilters);
  const [chip, setChip] = useState<string>("all");

  const query = useQuery({
    queryKey: ["costing", "processing", applied],
    queryFn: () => apiRequest(`/costing/processing${processQuery(applied)}`, greyIssuanceSchema),
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
          <h1 className="text-xl font-semibold">Costing: processing, estimated vs actual</h1>
          <p className="text-sm text-muted-foreground">PKR, one row per PO and process</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          Print
        </Button>
      </header>

      <FilterChips
        filters={toActive(applied, PROCESS_FILTER_LABELS)}
        onRemove={(key) => setApplied({ ...applied, [key]: "" })}
        onClear={() => setApplied(emptyProcessFilters)}
      />

      <SavedViews page="processing" filters={draft} onApply={(f) => { const next = { ...emptyProcessFilters, ...f } as ProcessFilterValues; setApplied(next); setDraft(next); setChip("all"); }} />

      <Card className="gap-0 py-0">
        <CardContent className="py-4">
          <ProcessFilterBar
            value={applied}
            onDraft={setDraft}
            options={data?.options}
            busy={query.isFetching}
            onApply={(v) => {
              setApplied(v);
              setChip("all");
            }}
            onReset={() => {
              setApplied(emptyProcessFilters);
              setChip("all");
            }}
          />
        </CardContent>
      </Card>

      {query.isError && (
        <p role="alert" className="text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : "The processing data did not load."}
        </p>
      )}
      {query.isPending && <PageSkeleton label="Loading processing" />}

      {data && (
        <>
          <p className="text-sm text-muted-foreground tabular">
            {filtersActive
              ? `${data.summary.po_count} of ${data.total_rows} lines shown, ${data.excluded_rows} excluded by the filters.`
              : `${data.total_rows} lines shown, none excluded.`}
          </p>

          <KpiStrip saving={data.summary.saving_pkr} estimated={data.summary.estimated_pkr} actual={data.summary.actual_pkr} over={data.summary.over_budget} under={data.summary.under_budget} />
          <section aria-labelledby="p-bottom" className="flex flex-col gap-4">
            <h2 id="p-bottom" className="text-lg font-semibold">Bottom line vs estimate</h2>
            <BottomLine data={data} onView={viewPo} />
          </section>

          <section aria-labelledby="p-pl" className="flex flex-col gap-4">
            <h2 id="p-pl" className="text-lg font-semibold">Profit and loss by process</h2>
            <ProfitLoss summary={data.summary} report={data.report} chips={processChips(data.report.chips)} chip={chip} onChip={setChip} unit="lines" />
          </section>

          <section aria-labelledby="p-table" className="flex flex-col gap-3">
            <h2 id="p-table" className="text-lg font-semibold">Lines by customer</h2>
            <PoTable
              rows={data.rows}
              chip={chip}
              columns={PROCESS_COLUMNS}
              sumFields={PROCESS_SUM_FIELDS}
              label="Processing by PO"
              detailTitle={(r) => `${String(r.CNTRCT_NO)}, ${String(r.PRCS ?? "")}`}
              detailFields={processDetailFields}
              rowUnit="lines"
            />
          </section>

          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading chart.</p>}>
            <ManagerChart data={data} />
          </Suspense>

          <Suspense fallback={<PageSkeleton label="Loading trend" />}>
            <MonthlyTrend base="/costing/processing" filters={applied} />
          </Suspense>

          <ExecutiveReport data={data} filters={applied} onView={viewPo} base="/costing/processing" />
        </>
      )}

      <SqlEditor />
    </div>
  );
}
