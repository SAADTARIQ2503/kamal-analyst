import { lazy, Suspense } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Figure } from "@/components/app/Metric";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { apiRequest } from "@/lib/api";
import { EMPTY, formatNumber, formatPkr } from "@/lib/format";
import { cn } from "@/lib/utils";

const stageSchema = z.object({
  key: z.string(),
  label: z.string(),
  lines: z.number().int(),
  comparable: z.number().int(),
  unknown: z.number().int(),
  estimated_pkr: z.string(),
  actual_pkr: z.string(),
  saving_pkr: z.string(),
  over_budget: z.number().int(),
  under_budget: z.number().int(),
  within_budget: z.number().int(),
});
const dashboardSchema = z.object({
  as_of: z.string(),
  stages: z.array(stageSchema),
  total_estimated_pkr: z.string(),
  total_actual_pkr: z.string(),
  total_saving_pkr: z.string(),
});

const STAGE_PAGES: Record<string, string> = {
  grey: "/costing/grey-issuance",
  processing: "/costing/processing",
  cut_to_pack: "/costing/cut-to-pack",
  yarn: "/garments/yarn",
  knitting: "/garments/knitting",
};

const StageChart = lazy(() => import("./StageChart"));

export function DashboardPage() {
  const query = useQuery({ queryKey: ["dashboard"], queryFn: () => apiRequest("/dashboard", dashboardSchema) });

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          All stages at a glance. Totals add stages in PKR. Each stage counts its own lines or POs.
          {query.data && ` Figures as of ${new Date(query.data.as_of).toLocaleString("en-GB")}.`}
        </p>
      </header>

      {query.isError && (
        <p role="alert" className="text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : "The dashboard did not load."}
        </p>
      )}
      {query.isPending && <PageSkeleton label="Loading dashboard" />}

      {query.data && (
        <>
          <Card className="gap-0 py-0">
            <CardContent className="py-0">
              <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
                <Figure label="Estimated, all stages" value={formatPkr(query.data.total_estimated_pkr)} note="PKR, lines with both values" />
                <Figure label="Actual, all stages" value={formatPkr(query.data.total_actual_pkr)} note="PKR, lines with both values" />
                <Figure
                  label="Net against estimate"
                  value={`${query.data.total_saving_pkr.startsWith("-") ? "" : "+"}${formatPkr(query.data.total_saving_pkr)}`}
                  note="PKR, all stages"
                  emphasis
                  tone={query.data.total_saving_pkr.startsWith("-") ? "negative" : "positive"}
                />
              </div>
            </CardContent>
          </Card>

          <section aria-labelledby="stage-cards" className="flex flex-col gap-3">
            <h2 id="stage-cards" className="text-lg font-semibold">By stage</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {query.data.stages.map((s) => {
                const negative = s.saving_pkr.startsWith("-");
                const none = s.lines === 0;
                const completeness = s.lines ? Math.round((100 * s.comparable) / s.lines) : null;
                return (
                  <Card key={s.key} className="gap-0 py-0">
                    <CardHeader className="border-b border-border py-4">
                      <CardTitle className="flex items-center justify-between text-sm font-medium">
                        <Link to={STAGE_PAGES[s.key] as "/costing/grey-issuance"} className="text-primary underline-offset-2 hover:underline">
                          {s.label}
                        </Link>
                        <span className="text-xs font-normal text-muted-foreground tabular">{formatNumber(s.lines)} lines</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 py-4">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-muted-foreground">Net</span>
                        <span className={cn("text-lg font-semibold tabular", none ? "" : negative ? "text-negative" : "text-positive")}>
                          {none ? EMPTY : `${negative ? "" : "+"}${formatPkr(s.saving_pkr)}`}
                        </span>
                      </div>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm tabular">
                        <dt className="text-muted-foreground">Estimated</dt>
                        <dd className="text-right">{none ? EMPTY : formatPkr(s.estimated_pkr)}</dd>
                        <dt className="text-muted-foreground">Actual</dt>
                        <dd className="text-right">{none ? EMPTY : formatPkr(s.actual_pkr)}</dd>
                        <dt className="text-muted-foreground">Over / under</dt>
                        <dd className="text-right">{none ? EMPTY : `${s.over_budget} / ${s.under_budget}`}</dd>
                        <dt className="text-muted-foreground">With both values</dt>
                        <dd className="text-right">{completeness === null ? EMPTY : `${completeness}%`}</dd>
                      </dl>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <Suspense fallback={<PageSkeleton label="Loading chart" />}>
            <StageChart stages={query.data.stages.map((s) => ({ label: s.label, saving: Number(s.saving_pkr) }))} />
          </Suspense>
        </>
      )}
    </div>
  );
}
