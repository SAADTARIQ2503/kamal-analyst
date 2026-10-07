import { sumMoney } from "@/lib/metrics";
import type { GreyIssuance } from "@/lib/schemas";

export type Row = GreyIssuance["rows"][number];

export type Flat =
  | { kind: "group"; key: string; buyer: string; count: number }
  | { kind: "po"; key: string; row: Row }
  | { kind: "subtotal"; key: string; buyer: string; totals: Record<string, string> };

const str = (v: unknown) => (v === null || v === undefined ? null : String(v));

export function isComparable(row: Row): boolean {
  return row.P_VALUE !== null && row.P_VALUE !== undefined && row.I_VALUE !== null && row.I_VALUE !== undefined;
}

export const SUM_FIELDS = ["P_QTY", "P_VALUE", "I_QTY", "I_VALUE", "P_VALUE_WRT_ISS", "profit_loss_pkr", "plan_vs_issued_pkr"] as const;
export const PROCESS_SUM_FIELDS = ["LOT_MTRS", "GREY_ISSUED", "FOLD_RCV", "SHIPPED_QTY", "P_VALUE", "I_VALUE", "profit_loss_pkr"] as const;

export function matchesChip(row: Row, chip: string): boolean {
  if (chip.startsWith("process:")) return String(row.PRCS ?? "") === chip.slice("process:".length);
  const pl = row.profit_loss_pkr === null || row.profit_loss_pkr === undefined ? null : String(row.profit_loss_pkr);
  switch (chip) {
    case "all":
      return true;
    case "profit":
      return pl !== null && !pl.startsWith("-");
    case "loss":
      return pl !== null && pl.startsWith("-");
    case "grey_complete":
      return row.GREY_CLOSE_STATUS === "CLOSE";
    case "grey_incomplete":
      return row.GREY_CLOSE_STATUS !== "CLOSE";
    case "shipped":
      return row.SHIPMENT_CLOSE_STATUS === "SHIPPED";
    case "running":
      return row.SHIPMENT_CLOSE_STATUS !== "SHIPPED";
    case "no_issue_cost":
    case "no_actual_cost":
      return row.I_VALUE === null || row.I_VALUE === undefined;
    default:
      return true;
  }
}

export function flatten(rows: Row[], chip: string, sumFields: readonly string[] = SUM_FIELDS, groupKey = "BUYER_ID"): Flat[] {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    if (!matchesChip(row, chip)) continue;
    const buyer = str(row[groupKey]) ?? "";
    groups.set(buyer, [...(groups.get(buyer) ?? []), row]);
  }
  const out: Flat[] = [];
  for (const buyer of [...groups.keys()].sort()) {
    const items = groups.get(buyer) ?? [];
    out.push({ kind: "group", key: `g:${buyer}`, buyer: buyer || "No value", count: items.length });
    for (const row of items) out.push({ kind: "po", key: `p:${String(row.CNTRCT_NO)}:${String(row.PRCS ?? "")}`, row });
    const totals: Record<string, string> = {};
    const comparable = items.filter(isComparable);
    for (const f of sumFields) totals[f] = sumMoney(comparable.map((r) => str(r[f]))).toFixed(2);
    out.push({ kind: "subtotal", key: `s:${buyer}`, buyer: buyer || "No value", totals });
  }
  return out;
}
