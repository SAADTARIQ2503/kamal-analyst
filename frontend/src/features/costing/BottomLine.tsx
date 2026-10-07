import Decimal from "decimal.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CountRow, Figure } from "@/components/app/Metric";
import { EMPTY, formatPkr } from "@/lib/format";
import { savingPercent } from "@/lib/metrics";
import type { GreyIssuance } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type Props = { data: Pick<GreyIssuance, "summary" | "report">; onView: (po: string) => void };

export function BottomLine({ data, onView }: Props) {
  const s = data.summary;
  const r = data.report;
  const net = new Decimal(s.saving_pkr);
  const pct = savingPercent(s.saving_pkr, s.estimated_pkr);
  const overrun = r.biggest_overrun;
  const saving = r.biggest_saving;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 divide-y divide-border rounded-lg border border-border md:grid-cols-3 md:divide-x md:divide-y-0">
        <Figure
          label="Net against estimate"
          value={`${net.isNegative() ? "" : "+"}${formatPkr(s.saving_pkr)}`}
          note={pct === null ? "PKR" : `PKR, ${net.isNegative() ? "" : "+"}${pct}% of estimate`}
          emphasis
          tone={net.isNegative() ? "negative" : "positive"}
        />
        <Figure label="Estimated cost" value={formatPkr(s.estimated_pkr)} note="PKR, POs with both values" />
        <Figure label="Actual cost" value={formatPkr(s.actual_pkr)} note="PKR, POs with both values" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="gap-0 py-0">
          <CardContent className="flex flex-col gap-3 py-4">
            <span className="text-sm text-muted-foreground">Needs attention</span>
            {overrun ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="font-medium tabular">{overrun.po}</span>
                  <span className="text-sm text-negative tabular">{formatPkr(overrun.amount_pkr)} PKR{overrun.manager ? `, ${overrun.manager}` : ""}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => onView(overrun.po)}>View PO</Button>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">{EMPTY}</span>
            )}
          </CardContent>
        </Card>
        <Card className="gap-0 py-0">
          <CardContent className="flex flex-col gap-3 py-4">
            <span className="text-sm text-muted-foreground">Largest saving</span>
            {saving ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="font-medium tabular">{saving.po}</span>
                  <span className={cn("text-sm tabular", "text-positive")}>+{formatPkr(saving.amount_pkr)} PKR{saving.manager ? `, ${saving.manager}` : ""}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => onView(saving.po)}>View PO</Button>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">{EMPTY}</span>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 divide-y divide-border rounded-lg border border-border sm:grid-cols-2 sm:divide-x xl:grid-cols-4 xl:divide-y-0">
        <CountRow label="Under budget" value={s.under_budget} tone="positive" />
        <CountRow label="Within budget" value={s.within_budget} tone="neutral" />
        <CountRow label="Over budget" value={s.over_budget} tone="negative" />
        <CountRow label="Not comparable" value={s.unknown} tone="warning" />
      </div>
    </div>
  );
}
