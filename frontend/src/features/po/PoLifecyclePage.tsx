import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { apiRequest } from "@/lib/api";
import { EMPTY, formatNumber, formatPkr } from "@/lib/format";
import { cn } from "@/lib/utils";

const stageSchema = z.object({
  key: z.string(),
  label: z.string(),
  lines: z.number().int(),
  comparable: z.number().int(),
  estimated_pkr: z.string(),
  actual_pkr: z.string(),
  saving_pkr: z.string(),
  over_budget: z.number().int(),
  under_budget: z.number().int(),
});
const lifecycleSchema = z.object({ po: z.string(), stages: z.array(stageSchema) });
const poOptionsSchema = z.object({ pos: z.array(z.string()) });

const STAGE_PAGES: Record<string, string> = {
  grey: "/costing/grey-issuance",
  processing: "/costing/processing",
  cut_to_pack: "/costing/cut-to-pack",
  yarn: "/garments/yarn",
  knitting: "/garments/knitting",
};

export function PoLifecyclePage() {
  const [draft, setDraft] = useState("");
  const [po, setPo] = useState("");
  const options = useQuery({ queryKey: ["po", "options"], queryFn: () => apiRequest("/po/options", poOptionsSchema) });
  const query = useQuery({
    queryKey: ["po", "lifecycle", po],
    queryFn: () => apiRequest(`/po/${encodeURIComponent(po)}/lifecycle`, lifecycleSchema),
    enabled: po.length > 0,
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">PO lifecycle</h1>
        <p className="text-sm text-muted-foreground">One PO across grey, processing, cut to pack, yarn and knitting.</p>
      </header>

      <Card className="gap-0 py-0">
        <CardContent className="py-4">
          <form
            className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) setPo(draft.trim());
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lookup_po">PO</Label>
              <Select id="lookup_po" value={draft} onChange={(e) => setDraft(e.target.value)} disabled={options.isPending}>
                <option value="">{options.isPending ? "Loading POs" : "Choose a PO"}</option>
                {(options.data?.pos ?? []).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" disabled={!draft.trim() || query.isFetching}>
              {query.isFetching ? "Loading" : "Look up"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {query.isError && (
        <p role="alert" className="text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : "The PO could not be loaded."}
        </p>
      )}
      {query.isPending && po && <PageSkeleton label="Loading PO" />}

      {query.data && (
        <section aria-labelledby="lc-heading" className="flex flex-col gap-3">
          <h2 id="lc-heading" className="text-lg font-semibold tabular">
            {query.data.po}
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-max border-collapse text-sm tabular-nums">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Stage</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Lines</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Estimated (PKR)</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Actual (PKR)</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Net (PKR)</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Over / under</th>
                </tr>
              </thead>
              <tbody>
                {query.data.stages.map((s) => {
                  const negative = s.saving_pkr.startsWith("-");
                  const none = s.lines === 0;
                  return (
                    <tr key={s.key} className="border-t border-border">
                      <td className="px-4 py-3">
                        <Link to={STAGE_PAGES[s.key] as "/costing/grey-issuance"} className="font-medium text-primary underline-offset-2 hover:underline">
                          {s.label}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right">{formatNumber(s.lines)}</td>
                      <td className="px-4 py-3 text-right">{none ? EMPTY : formatPkr(s.estimated_pkr)}</td>
                      <td className="px-4 py-3 text-right">{none ? EMPTY : formatPkr(s.actual_pkr)}</td>
                      <td className={cn("px-4 py-3 text-right", !none && (negative ? "text-negative" : "text-positive"))}>
                        {none ? EMPTY : `${negative ? "" : "+"}${formatPkr(s.saving_pkr)}`}
                      </td>
                      <td className="px-4 py-3 text-right">{none ? EMPTY : `${s.over_budget} / ${s.under_budget}`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">Stage names link to the stage page. Those pages show all POs, so search the PO there to see its lines.</p>
        </section>
      )}
    </div>
  );
}
