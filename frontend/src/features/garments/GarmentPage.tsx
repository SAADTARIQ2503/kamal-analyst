import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

import { Label } from "@/components/ui/label";
import { BottomLine } from "@/features/costing/BottomLine";
import { KpiStrip } from "@/components/app/KpiStrip";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { ExecutiveReport } from "@/features/costing/ExecutiveReport";
import type { DetailField } from "@/features/costing/PoDetails";
import { PoTable } from "@/features/costing/PoTable";
import { ProfitLoss, type ChipDef } from "@/features/costing/ProfitLoss";
import { SqlEditor } from "@/features/costing/SqlEditor";
import type { Col } from "@/features/costing/tableTypes";
import type { Row } from "@/features/costing/groupRows";
import { apiRequest } from "@/lib/api";
import { SavedViews } from "@/features/costing/SavedViews";
import { FilterChips } from "@/components/app/FilterChips";
import { toActive } from "@/features/costing/activeFilters";
import { greyIssuanceSchema, type GreyIssuance } from "@/lib/schemas";

export type GarmentConfig = {
  title: string;
  subtitle: string;
  base: string;
  columns: Col[];
  defaultKeys: string[];
  sumFields: readonly string[];
  chips: ChipDef[];
  detailTitle: (r: Row) => string;
  detailFields: (r: Row) => DetailField[];
  unit: string;
  viewPage: string;
};

const poSchema = z.object({ po: z.string().trim().max(64) });
type PoValues = z.infer<typeof poSchema>;

function PoFilter({ value, options, busy, onApply, onReset, onDraft }: { value: PoValues; options: string[] | undefined; busy: boolean; onApply: (v: PoValues) => void; onReset: () => void; onDraft: (v: PoValues) => void }) {
  const form = useForm<PoValues>({ resolver: zodResolver(poSchema), defaultValues: value });
  useEffect(() => {
    form.reset(value);
  }, [value, form]);
  useEffect(() => {
    const sub = form.watch((v) => onDraft({ po: v.po ?? "" }));
    return () => sub.unsubscribe();
  }, [form, onDraft]);
  return (
    <form className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]" onSubmit={form.handleSubmit(onApply)} noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="g_po">PO</Label>
        <Select id="g_po" {...form.register("po")}>
          <option value="">All</option>
          {(options ?? []).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </Select>
      </div>
      <Button type="button" variant="outline" onClick={() => { form.reset({ po: "" }); onReset(); }} disabled={busy}>
        Reset
      </Button>
      <Button type="submit" disabled={busy}>
        {busy ? "Loading" : "Apply"}
      </Button>
    </form>
  );
}

export function GarmentPage({ config }: { config: GarmentConfig }) {
  const [applied, setApplied] = useState<PoValues>({ po: "" });
  const [draft, setDraft] = useState<PoValues>({ po: "" });
  const [chip, setChip] = useState<string>("all");
  const [showAll, setShowAll] = useState(false);

  const query = useQuery({
    queryKey: ["garments", config.base, applied],
    queryFn: () => apiRequest(`${config.base}${applied.po ? `?po=${encodeURIComponent(applied.po)}` : ""}`, greyIssuanceSchema),
    placeholderData: keepPreviousData,
  });
  const data: GreyIssuance | undefined = query.data;
  const columns = showAll ? config.columns : config.columns.filter((c) => config.defaultKeys.includes(c.key));

  const viewPo = (po: string) => {
    setApplied({ po });
    setChip("all");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">{config.title}</h1>
          <p className="text-sm text-muted-foreground">{config.subtitle}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          Print
        </Button>
      </header>

      <FilterChips
        filters={toActive(applied, { po: "PO" })}
        onRemove={() => { setApplied({ po: "" }); setChip("all"); }}
        onClear={() => { setApplied({ po: "" }); setChip("all"); }}
      />

      <SavedViews page={config.viewPage} filters={draft} onApply={(f) => { const next = { po: f.po ?? "" }; setApplied(next); setDraft(next); setChip("all"); }} />

      <Card className="gap-0 py-0">
        <CardContent className="py-4">
          <PoFilter
            value={applied}
            onDraft={setDraft}
            options={data?.options.po}
            busy={query.isFetching}
            onApply={(v) => {
              setApplied(v);
              setChip("all");
            }}
            onReset={() => {
              setApplied({ po: "" });
              setChip("all");
            }}
          />
        </CardContent>
      </Card>

      {query.isError && (
        <p role="alert" className="text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : "The data did not load."}
        </p>
      )}
      {query.isPending && <PageSkeleton label="Loading" />}

      {data && (
        <>
          <p className="text-sm text-muted-foreground tabular">
            {applied.po
              ? `${data.summary.po_count} of ${data.total_rows} lines shown, ${data.excluded_rows} excluded by the filter.`
              : `${data.total_rows} lines shown, none excluded.`}
          </p>

          <KpiStrip saving={data.summary.saving_pkr} estimated={data.summary.estimated_pkr} actual={data.summary.actual_pkr} over={data.summary.over_budget} under={data.summary.under_budget} />
          <section aria-labelledby="g-bottom" className="flex flex-col gap-4">
            <h2 id="g-bottom" className="text-lg font-semibold">Bottom line vs estimate</h2>
            <BottomLine data={data} onView={viewPo} />
          </section>

          <section aria-labelledby="g-pl" className="flex flex-col gap-4">
            <h2 id="g-pl" className="text-lg font-semibold">Profit and loss by line</h2>
            <ProfitLoss summary={data.summary} report={data.report} chips={config.chips} chip={chip} onChip={setChip} unit={config.unit} />
          </section>

          <section aria-labelledby="g-table" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <h2 id="g-table" className="text-lg font-semibold">Lines by PO</h2>
              <Button variant="outline" size="sm" onClick={() => setShowAll((v) => !v)}>
                {showAll ? "Show fewer columns" : "Show all columns"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground tabular">
              Showing {columns.length} of {config.columns.length} columns
            </p>
            <PoTable
              rows={data.rows}
              chip={chip}
              columns={columns}
              sumFields={config.sumFields}
              label={config.title}
              detailTitle={config.detailTitle}
              detailFields={config.detailFields}
              groupKey="CNTRCT_NO"
              rowUnit="lines"
            />
          </section>

          <ExecutiveReport data={data} filters={applied} onView={viewPo} base={config.base} />
        </>
      )}

      <SqlEditor />
    </div>
  );
}
