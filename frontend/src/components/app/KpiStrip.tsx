import Decimal from "decimal.js";
import { formatPkr } from "@/lib/format";
import { savingPercent } from "@/lib/metrics";
import { cn } from "@/lib/utils";

type Props = {
  saving: string;
  estimated: string;
  actual: string;
  over: number;
  under: number;
};

export function KpiStrip({ saving, estimated, actual, over, under }: Props) {
  const negative = new Decimal(saving).isNegative();
  const pct = savingPercent(saving, estimated);
  return (
    <div className="sticky top-0 z-20 -mx-6 border-b border-border bg-background/95 px-6 py-2 backdrop-blur-none">
      <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm tabular">
        <div className="flex items-baseline gap-2">
          <dt className="text-muted-foreground">Net</dt>
          <dd className={cn("font-semibold", negative ? "text-negative" : "text-positive")}>
            {negative ? "" : "+"}
            {formatPkr(saving)} PKR{pct !== null ? ` (${negative ? "" : "+"}${pct}%)` : ""}
          </dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="text-muted-foreground">Estimated</dt>
          <dd>{formatPkr(estimated)} PKR</dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="text-muted-foreground">Actual</dt>
          <dd>{formatPkr(actual)} PKR</dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="text-muted-foreground">Over / under</dt>
          <dd>
            {over} / {under}
          </dd>
        </div>
      </dl>
    </div>
  );
}
