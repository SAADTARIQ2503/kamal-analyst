import { Figure } from "@/components/app/Metric";
import { Card, CardContent } from "@/components/ui/card";
import { formatPkr } from "@/lib/format";
import type { GreyIssuance } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export type ChipDef = { key: string; label: string };

export const GREY_CHIPS: ChipDef[] = [
  { key: "all", label: "All" },
  { key: "profit", label: "Profit" },
  { key: "loss", label: "Loss" },
  { key: "grey_complete", label: "Grey complete" },
  { key: "grey_incomplete", label: "Grey incomplete" },
  { key: "shipped", label: "Shipped" },
  { key: "running", label: "Running" },
  { key: "no_issue_cost", label: "No actual cost" },
];

export function processChips(counts: Record<string, number>): ChipDef[] {
  const fixed: ChipDef[] = [
    { key: "all", label: "All" },
    { key: "profit", label: "Profit" },
    { key: "loss", label: "Loss" },
    { key: "no_actual_cost", label: "No actual cost" },
  ];
  const processes = Object.keys(counts)
    .filter((k) => k.startsWith("process:"))
    .map((k) => ({ key: k, label: k.slice("process:".length) }));
  return [...fixed, ...processes];
}

type Props = {
  summary: GreyIssuance["summary"];
  report: GreyIssuance["report"];
  chips: ChipDef[];
  chip: string;
  onChip: (c: string) => void;
  unit?: string;
};

export function ProfitLoss({ summary, report, chips, chip, onChip, unit = "POs" }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 divide-y divide-border rounded-lg border border-border md:grid-cols-3 md:divide-x md:divide-y-0">
        <Figure label="Total profit" value={`+${formatPkr(report.profit_pkr)}`} note={`PKR, ${report.profit_pos} ${unit} under estimate`} tone="positive" />
        <Figure label="Total loss" value={formatPkr(report.loss_pkr)} note={`PKR, ${report.loss_pos} ${unit} over estimate`} tone="negative" />
        <Figure label="Net" value={formatPkr(summary.saving_pkr)} note="PKR, total profit plus total loss" />
      </div>
      <Card className="gap-0 py-0">
        <CardContent className="flex flex-wrap gap-2 py-4" role="group" aria-label="Filter POs">
          {chips.map((c) => {
            const count = report.chips[c.key] ?? 0;
            const active = chip === c.key;
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={active}
                onClick={() => onChip(c.key)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm tabular",
                  active ? "border-primary bg-accent font-medium text-accent-foreground" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {c.label} <span className="ml-1 text-xs">{count}</span>
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
