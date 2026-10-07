import { EMPTY, formatNumber, formatPkr } from "@/lib/format";
import type { Row } from "@/features/costing/groupRows";
import type { DetailField } from "@/features/costing/PoDetails";
import { isNeg, numeric, type Col } from "@/features/costing/tableTypes";

const money = (v: unknown) => (v === null || v === undefined || v === "" ? EMPTY : formatPkr(String(v)));
const kg = (v: unknown) => (v === null || v === undefined || v === "" ? EMPTY : `${formatNumber(v)} kg`);
const num = (key: string) => (r: Row) => numeric(r[key]);

export const KNIT_SUM_FIELDS = ["REQ_KGS", "KNIT_KGS", "P_VALUE", "I_VALUE", "profit_loss_pkr"] as const;

export const KNIT_COLUMNS: Col[] = [
  { key: "po", label: "PO", align: "left", sortValue: (r) => String(r.CNTRCT_NO ?? ""), render: (r) => String(r.CNTRCT_NO ?? EMPTY), negative: () => false },
  { key: "qlty", label: "Quality", align: "left", sortValue: (r) => String(r.QLTY ?? ""), render: (r) => String(r.QLTY ?? EMPTY), negative: () => false },
  { key: "req", label: "Required kg", align: "right", sortValue: num("REQ_KGS"), render: (r) => kg(r.REQ_KGS), total: (t) => formatNumber(t.REQ_KGS), negative: () => false },
  { key: "knit", label: "Knitted kg", align: "right", sortValue: num("KNIT_KGS"), render: (r) => kg(r.KNIT_KGS), total: (t) => formatNumber(t.KNIT_KGS), negative: () => false },
  { key: "pre", label: "Pre rate (PKR/kg)", align: "right", sortValue: num("PRE_RATE"), render: (r) => formatNumber(r.PRE_RATE), negative: () => false },
  { key: "post", label: "Post rate (PKR/kg)", align: "right", sortValue: num("POST_RATE"), render: (r) => formatNumber(r.POST_RATE), negative: () => false },
  { key: "est", label: "Estimated (PKR)", align: "right", sortValue: num("P_VALUE"), render: (r) => money(r.P_VALUE), total: (t) => formatPkr(t.P_VALUE), negative: () => false },
  { key: "act", label: "Actual (PKR)", align: "right", sortValue: num("I_VALUE"), render: (r) => money(r.I_VALUE), total: (t) => formatPkr(t.I_VALUE), negative: () => false },
  {
    key: "pl",
    label: "Profit or loss (PKR)",
    align: "right",
    sortValue: num("profit_loss_pkr"),
    render: (r) => (r.profit_loss_pkr ? `${formatPkr(String(r.profit_loss_pkr))}${r.profit_loss_pct ? ` (${formatNumber(r.profit_loss_pct)}%)` : ""}` : EMPTY),
    total: (t) => formatPkr(t.profit_loss_pkr),
    negative: (r) => isNeg(r.profit_loss_pkr),
  },
];

export const KNIT_DEFAULT_KEYS = ["po", "pre", "post"];

export function knitDetailFields(r: Row): DetailField[] {
  return [
    ["Quality", String(r.QLTY ?? EMPTY)],
    ["Required kg", kg(r.REQ_KGS)],
    ["Knitted kg", kg(r.KNIT_KGS)],
    ["Pre rate (PKR/kg)", formatNumber(r.PRE_RATE)],
    ["Post rate (PKR/kg)", formatNumber(r.POST_RATE)],
    ["Estimated", money(r.P_VALUE)],
    ["Actual", money(r.I_VALUE)],
    ["Profit or loss", money(r.profit_loss_pkr)],
    ["Profit or loss, percent of estimate", r.profit_loss_pct ? `${formatNumber(r.profit_loss_pct)}%` : EMPTY],
  ];
}
