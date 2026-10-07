import { EMPTY, formatDate, formatNumber, formatPercent, formatPkr } from "@/lib/format";
import type { Row } from "./groupRows";
import type { DetailField } from "./PoDetails";
import { isNeg, numeric, type Col } from "./tableTypes";

const money = (v: unknown) => (v === null || v === undefined || v === "" ? EMPTY : formatPkr(String(v)));
const count = (v: unknown) => (v === null || v === undefined || v === "" ? EMPTY : formatNumber(v));

export const CUT_SUM_FIELDS = ["REQ_SET", "STICH_SET", "PACK_SET", "SHIP_SET", "P_VALUE", "I_VALUE", "profit_loss_pkr"] as const;

export const CUT_COLUMNS: Col[] = [
  { key: "po", label: "PO", align: "left", sortValue: (r) => String(r.CNTRCT_NO ?? ""), render: (r) => String(r.CNTRCT_NO ?? EMPTY), negative: () => false },
  { key: "set", label: "Set name", align: "left", sortValue: (r) => String(r.SET_NAME ?? ""), render: (r) => String(r.SET_NAME ?? EMPTY), negative: () => false },
  { key: "size", label: "Size", align: "left", sortValue: (r) => String(r.SIZ ?? ""), render: (r) => String(r.SIZ ?? EMPTY), negative: () => false },
  { key: "colour", label: "Colour", align: "left", sortValue: (r) => String(r.COLR ?? ""), render: (r) => String(r.COLR ?? EMPTY), negative: () => false },
  { key: "design", label: "Design", align: "left", sortValue: (r) => String(r.DSGN ?? ""), render: (r) => String(r.DSGN ?? EMPTY), negative: () => false },
  { key: "req", label: "Required sets", align: "right", sortValue: (r) => numeric(r.REQ_SET), render: (r) => count(r.REQ_SET), total: (t) => formatNumber(t.REQ_SET), negative: () => false },
  { key: "stitch", label: "Stitched sets", align: "right", sortValue: (r) => numeric(r.STICH_SET), render: (r) => count(r.STICH_SET), total: (t) => formatNumber(t.STICH_SET), negative: () => false },
  { key: "pack", label: "Packed sets", align: "right", sortValue: (r) => numeric(r.PACK_SET), render: (r) => count(r.PACK_SET), total: (t) => formatNumber(t.PACK_SET), negative: () => false },
  { key: "ship", label: "Shipped sets", align: "right", sortValue: (r) => numeric(r.SHIP_SET), render: (r) => count(r.SHIP_SET), total: (t) => formatNumber(t.SHIP_SET), negative: () => false },
  { key: "est", label: "Estimated (PKR)", align: "right", sortValue: (r) => numeric(r.P_VALUE), render: (r) => money(r.P_VALUE), total: (t) => formatPkr(t.P_VALUE), negative: () => false },
  { key: "act", label: "Actual (PKR)", align: "right", sortValue: (r) => numeric(r.I_VALUE), render: (r) => money(r.I_VALUE), total: (t) => formatPkr(t.I_VALUE), negative: () => false },
  {
    key: "pl",
    label: "Profit or loss (PKR)",
    align: "right",
    sortValue: (r) => numeric(r.profit_loss_pkr),
    render: (r) => (r.profit_loss_pkr ? `${formatPkr(String(r.profit_loss_pkr))}${r.profit_loss_pct ? ` (${formatNumber(r.profit_loss_pct)}%)` : ""}` : EMPTY),
    total: (t) => formatPkr(t.profit_loss_pkr),
    negative: (r) => isNeg(r.profit_loss_pkr),
  },
  { key: "pre", label: "Pre rate (PKR)", align: "right", sortValue: (r) => numeric(r.P_RATE), render: (r) => formatNumber(r.P_RATE), negative: () => false },
  { key: "post", label: "Post rate (PKR)", align: "right", sortValue: (r) => numeric(r.I_RATE), render: (r) => formatNumber(r.I_RATE), negative: () => false },
];

export function cutDetailFields(r: Row): DetailField[] {
  const pkr = (v: unknown) => (v === null || v === undefined || v === "" ? EMPTY : formatPkr(String(v)));
  return [
    ["Document", String(r.DOC_ID ?? EMPTY)],
    ["Created", formatDate(r.CREATION_DATE)],
    ["Set name", String(r.SET_NAME ?? EMPTY)],
    ["Size", String(r.SIZ ?? EMPTY)],
    ["Colour", String(r.COLR ?? EMPTY)],
    ["Design", String(r.DSGN ?? EMPTY)],
    ["Required sets", count(r.REQ_SET)],
    ["Stitched sets", count(r.STICH_SET)],
    ["Packed sets", count(r.PACK_SET)],
    ["Shipped sets", count(r.SHIP_SET)],
    ["Pack meters", count(r.PACK_MTRS)],
    ["Estimated (pre-cost)", pkr(r.P_VALUE)],
    ["Actual (post-cost)", pkr(r.I_VALUE)],
    ["Profit or loss", pkr(r.profit_loss_pkr)],
    ["Profit or loss, percent of estimate", r.profit_loss_pct ? `${formatNumber(r.profit_loss_pct)}%` : EMPTY],
    ["Pre rate (PKR)", formatNumber(r.P_RATE)],
    ["Post rate (PKR)", formatNumber(r.I_RATE)],
    ["Issued vs planned", formatPercent(r.ISS_VS_PLAN_QTY_PRCNT)],
  ];
}
