import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api";
import { greyIssuanceSchema, type GreyIssuance } from "@/lib/schemas";
import { BottomLine } from "./BottomLine";
import { KpiStrip } from "@/components/app/KpiStrip";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { CUT_COLUMNS, CUT_SUM_FIELDS, cutDetailFields } from "./cutColumns";
import { ExecutiveReport } from "./ExecutiveReport";
import { PoTable } from "./PoTable";
import { ProfitLoss, type ChipDef } from "./ProfitLoss";
import { SqlEditor } from "./SqlEditor";
import { SavedViews } from "./SavedViews";
import { FilterChips } from "@/components/app/FilterChips";
import { toActive } from "./activeFilters";

const CUT_CHIPS: ChipDef[] = [
  { key: "all", label: "All" },
  { key: "profit", label: "Profit" },
  { key: "loss", label: "Loss" },
  { key: "grey_complete", label: "Completed" },
  { key: "grey_incomplete", label: "Incomplete" },
  { key: "no_issue_cost", label: "No issue cost" },
];

const poSchema = z.object({ po: z.string().trim().max(64) });
type PoValues = z.infer<typeof poSchema>;

function PoFilter({ options, busy, onApply, onReset, value, onDraft }: { options: string[] | undefined; busy: boolean; onApply: (v: PoValues) => void; onReset: () => void; value: PoValues; onDraft: (v: PoValues) => void }) {
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
        <Label htmlFor="cut_po">PO</Label>
        <Select id="cut_po" {...form.register("po")}>
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

export function CutToPackPage() {
  const [applied, setApplied] = useState<PoValues>({ po: "" });
  const [draft, setDraft] = useState<PoValues>({ po: "" });
  const [chip, setChip] = useState<string>("all");

  const query = useQuery({
    queryKey: ["costing", "cut-to-pack", applied],
    queryFn: () => apiRequest(`/costing/cut-to-pack${applied.po ? `?po=${encodeURIComponent(applied.po)}` : ""}`, greyIssuanceSchema),
    placeholderData: keepPreviousData,
  });
  const data: GreyIssuance | undefined = query.data;

  const viewPo = (po: string) => {
    setApplied({ po });
    setChip("all");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Costing: cut to pack, estimated vs actual</h1>
          <p className="text-sm text-muted-foreground">PKR, one row per set</p>
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

      <SavedViews page="cut_to_pack" filters={draft} onApply={(f) => { const next = { po: f.po ?? "" }; setApplied(next); setDraft(next); setChip("all"); }} />

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
          {query.error instanceof Error ? query.error.message : "The cut to pack data did not load."}
        </p>
      )}
      {query.isPending && <PageSkeleton label="Loading cut to pack" />}

      {data && (
        <>
          <p className="text-sm text-muted-foreground tabular">
            {applied.po
              ? `${data.summary.po_count} of ${data.total_rows} sets shown, ${data.excluded_rows} excluded by the filter.`
              : `${data.total_rows} sets shown, none excluded.`}
          </p>

          <KpiStrip saving={data.summary.saving_pkr} estimated={data.summary.estimated_pkr} actual={data.summary.actual_pkr} over={data.summary.over_budget} under={data.summary.under_budget} />
          <section aria-labelledby="c-bottom" className="flex flex-col gap-4">
            <h2 id="c-bottom" className="text-lg font-semibold">Bottom line vs estimate</h2>
            <BottomLine data={data} onView={viewPo} />
          </section>

          <section aria-labelledby="c-pl" className="flex flex-col gap-4">
            <h2 id="c-pl" className="text-lg font-semibold">Profit and loss by set</h2>
            <ProfitLoss summary={data.summary} report={data.report} chips={CUT_CHIPS} chip={chip} onChip={setChip} unit="sets" />
          </section>

          <section aria-labelledby="c-table" className="flex flex-col gap-3">
            <h2 id="c-table" className="text-lg font-semibold">Sets by PO</h2>
            <PoTable
              rows={data.rows}
              chip={chip}
              columns={CUT_COLUMNS}
              sumFields={CUT_SUM_FIELDS}
              label="Cut to pack by PO"
              detailTitle={(r) => `${String(r.CNTRCT_NO)}, ${String(r.SET_NAME ?? "")}`}
              detailFields={cutDetailFields}
              groupKey="CNTRCT_NO"
              rowUnit="sets"
            />
          </section>

          <ExecutiveReport data={data} filters={applied} onView={viewPo} base="/costing/cut-to-pack" />
        </>
      )}

      <SqlEditor />
    </div>
  );
}
