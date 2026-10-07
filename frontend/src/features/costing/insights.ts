import Decimal from "decimal.js";
import { formatPkr } from "@/lib/format";
import type { GreyIssuance } from "@/lib/schemas";

export type Insight = { title: string; body: string; po?: string };

export function buildInsights(data: Pick<GreyIssuance, "summary" | "report">): Insight[] {
  const s = data.summary;
  const saving = new Decimal(s.saving_pkr);
  const insights: Insight[] = [];
  insights.push({
    title: `${saving.isNegative() ? "Over" : "Under"} budget by ${formatPkr(saving.abs().toString())} PKR`,
    body: `Across ${s.po_count} POs the actual cost is ${formatPkr(s.actual_pkr)} PKR against an estimate of ${formatPkr(s.estimated_pkr)} PKR.`,
  });
  insights.push({
    title: `${s.under_budget} POs under estimate, ${s.over_budget} over`,
    body: `${s.under_budget} POs came in cheaper than estimated and ${s.over_budget} cost more. ${s.unknown} cannot be compared.`,
  });
  const r = data.report;
  if (r.biggest_overrun) {
    insights.push({
      title: `Largest overspend: ${r.biggest_overrun.po}`,
      body: `PO ${r.biggest_overrun.po} cost ${formatPkr(new Decimal(r.biggest_overrun.amount_pkr).abs().toString())} PKR more than estimated.`,
      po: r.biggest_overrun.po,
    });
  }
  if (r.biggest_saving) {
    insights.push({
      title: `Largest saving: ${r.biggest_saving.po}`,
      body: `PO ${r.biggest_saving.po} came in ${formatPkr(r.biggest_saving.amount_pkr)} PKR under estimate.`,
      po: r.biggest_saving.po,
    });
  }
  return insights;
}
