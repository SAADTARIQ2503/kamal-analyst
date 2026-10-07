import { EMPTY, formatDate, formatNumber, formatPkr } from "@/lib/format";
import type { Row } from "./groupRows";
import type { DetailField } from "./PoDetails";
import { isNeg, numeric, type Col } from "./tableTypes";

const money = (v: unknown) => (v === null || v === undefined || v === "" ? EMPTY : formatPkr(String(v)));

export const PROCESS_COLUMNS: Col[] = [
  { key: "po", label: "PO", align: "left", sortValue: (r) => String(r.CNTRCT_NO ?? ""), render: (r) => String(r.CNTRCT_NO ?? EMPTY), negative: () => false },
  { key: "prcs", label: "Process", align: "left", sortValue: (r) => String(r.PRCS ?? ""), render: (r) => String(r.PRCS ?? EMPTY), negative: () => false },
  { key: "lot", label: "Lot meters", align: "right", sortValue: (r) => numeric(r.LOT_MTRS), render: (r) => formatNumber(r.LOT_MTRS), total: (t) => formatNumber(t.LOT_MTRS), negative: () => false },
  { key: "iss", label: "Issued meters", align: "right", sortValue: (r) => numeric(r.GREY_ISSUED), render: (r) => formatNumber(r.GREY_ISSUED), total: (t) => formatNumber(t.GREY_ISSUED), negative: () => false },
  { key: "fold", label: "Fold received", align: "right", sortValue: (r) => numeric(r.FOLD_RCV), render: (r) => formatNumber(r.FOLD_RCV), total: (t) => formatNumber(t.FOLD_RCV), negative: () => false },
  { key: "ship", label: "Shipped meters", align: "right", sortValue: (r) => numeric(r.SHIPPED_QTY), render: (r) => formatNumber(r.SHIPPED_QTY), total: (t) => formatNumber(t.SHIPPED_QTY), negative: () => false },
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
  { key: "diff", label: "Rate difference", align: "right", sortValue: (r) => numeric(r.DIFF_RATE), render: (r) => formatNumber(r.DIFF_RATE), negative: (r) => isNeg(r.DIFF_RATE) },
  { key: "postlot", label: "Post rate (lot meters)", align: "right", sortValue: (r) => numeric(r.POST_RATE_LOTMTRS), render: (r) => formatNumber(r.POST_RATE_LOTMTRS), negative: () => false },
  { key: "difflot", label: "Rate difference (lot meters)", align: "right", sortValue: (r) => numeric(r.DIFF_RATE_LOTMTRS), render: (r) => formatNumber(r.DIFF_RATE_LOTMTRS), negative: (r) => isNeg(r.DIFF_RATE_LOTMTRS) },
];

export function processDetailFields(r: Row): DetailField[] {
  const pkr = (v: unknown) => (v === null || v === undefined || v === "" ? EMPTY : formatPkr(String(v)));
  return [
    ["Customer", String(r.BUYER_ID ?? EMPTY)],
    ["Manager", String(r.MNGR_ID ?? EMPTY)],
    ["Process", String(r.PRCS ?? EMPTY)],
    ["Lot cost date", formatDate(r.LOT_COST_DATE)],
    ["Lot meters", formatNumber(r.LOT_MTRS)],
    ["Issued meters", formatNumber(r.GREY_ISSUED)],
    ["Fold received", formatNumber(r.FOLD_RCV)],
    ["Shipped meters", formatNumber(r.SHIPPED_QTY)],
    ["Shipped date", formatDate(r.SHIPPED_DATE)],
    ["Estimated (pre-cost)", pkr(r.P_VALUE)],
    ["Actual (post-cost)", pkr(r.I_VALUE)],
    ["Overhead", pkr(r.OVERHEAD_AMNT)],
    ["Depreciation", pkr(r.DEPRICIATION_AMNT)],
    ["Profit or loss", pkr(r.profit_loss_pkr)],
    ["Profit or loss, percent of estimate", r.profit_loss_pct ? `${formatNumber(r.profit_loss_pct)}%` : EMPTY],
    ["Pre rate (PKR)", formatNumber(r.P_RATE)],
    ["Post rate (PKR)", formatNumber(r.I_RATE)],
    ["Rate difference", formatNumber(r.DIFF_RATE)],
  ];
}
