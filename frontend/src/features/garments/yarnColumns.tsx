import { EMPTY, formatNumber, formatPkr } from "@/lib/format";
import type { Row } from "@/features/costing/groupRows";
import type { DetailField } from "@/features/costing/PoDetails";
import { isNeg, numeric, type Col } from "@/features/costing/tableTypes";

const money = (v: unknown) => (v === null || v === undefined || v === "" ? EMPTY : formatPkr(String(v)));
const kg = (v: unknown) => (v === null || v === undefined || v === "" ? EMPTY : `${formatNumber(v)} kg`);

export const YARN_SUM_FIELDS = ["REQ_KGS", "ISS_KGS", "PRE_AMNT", "POST_AMNT", "ISS_PRE_AMNT", "ISS_POST_AMNT", "profit_loss_pkr"] as const;

const num = (key: string) => (r: Row) => numeric(r[key]);

export const YARN_COLUMNS: Col[] = [
  { key: "po", label: "PO", align: "left", sortValue: (r) => String(r.CNTRCT_NO ?? ""), render: (r) => String(r.CNTRCT_NO ?? EMPTY), negative: () => false },
  { key: "count", label: "Yarn count", align: "left", sortValue: (r) => String(r.YCOUNT ?? ""), render: (r) => String(r.YCOUNT ?? EMPTY), negative: () => false },
  { key: "req", label: "Required kg", align: "right", sortValue: num("REQ_KGS"), render: (r) => kg(r.REQ_KGS), total: (t) => formatNumber(t.REQ_KGS), negative: () => false },
  { key: "iss", label: "Issued kg", align: "right", sortValue: num("ISS_KGS"), render: (r) => kg(r.ISS_KGS), total: (t) => formatNumber(t.ISS_KGS), negative: () => false },
  { key: "pre", label: "Pre rate (PKR/kg)", align: "right", sortValue: num("PRE_RATE"), render: (r) => formatNumber(r.PRE_RATE), negative: () => false },
  { key: "post", label: "Post rate (PKR/kg)", align: "right", sortValue: num("POST_RATE"), render: (r) => formatNumber(r.POST_RATE), negative: () => false },
  { key: "preamt", label: "Required estimate (PKR)", align: "right", sortValue: num("PRE_AMNT"), render: (r) => money(r.PRE_AMNT), total: (t) => formatPkr(t.PRE_AMNT), negative: () => false },
  { key: "postamt", label: "Actual (PKR)", align: "right", sortValue: num("POST_AMNT"), render: (r) => money(r.POST_AMNT), total: (t) => formatPkr(t.POST_AMNT), negative: () => false },
  { key: "isspre", label: "Estimated on issued kg (PKR)", align: "right", sortValue: num("ISS_PRE_AMNT"), render: (r) => money(r.ISS_PRE_AMNT), total: (t) => formatPkr(t.ISS_PRE_AMNT), negative: () => false },
  { key: "isspost", label: "Actual on issued kg (PKR)", align: "right", sortValue: num("ISS_POST_AMNT"), render: (r) => money(r.ISS_POST_AMNT), total: (t) => formatPkr(t.ISS_POST_AMNT), negative: () => false },
];

export const YARN_DEFAULT_KEYS = ["po", "pre", "post"];

export function yarnDetailFields(r: Row): DetailField[] {
  return [
    ["Yarn count", String(r.YCOUNT ?? EMPTY)],
    ["Required kg", kg(r.REQ_KGS)],
    ["Issued kg", kg(r.ISS_KGS)],
    ["Pre rate (PKR/kg)", formatNumber(r.PRE_RATE)],
    ["Post rate (PKR/kg)", formatNumber(r.POST_RATE)],
    ["Estimated on issued kg", money(r.ISS_PRE_AMNT)],
    ["Actual", money(r.POST_AMNT)],
    ["Profit or loss", money(r.profit_loss_pkr)],
    ["Profit or loss, percent of estimate", r.profit_loss_pct ? `${formatNumber(r.profit_loss_pct)}%` : EMPTY],
    ["Negative value", isNeg(r.profit_loss_pkr) ? "Yes" : "No"],
  ];
}
