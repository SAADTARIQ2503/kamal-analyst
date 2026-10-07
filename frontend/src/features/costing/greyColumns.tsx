import { EMPTY, formatDate, formatNumber, formatPercent, formatPkr } from "@/lib/format";
import type { Row } from "./groupRows";
import type { DetailField } from "./PoDetails";
import { isNeg, numeric, type Col } from "./tableTypes";

const money = (v: unknown) => (v === null || v === undefined || v === "" ? EMPTY : formatPkr(String(v)));

export const GREY_COLUMNS: Col[] = [
  { key: "po", label: "PO", align: "left", sortValue: (r) => String(r.CNTRCT_NO ?? ""), render: (r) => String(r.CNTRCT_NO ?? EMPTY), negative: () => false },
  { key: "pq", label: "Estimated qty", align: "right", sortValue: (r) => numeric(r.P_QTY), render: (r) => formatNumber(r.P_QTY), total: (t) => formatNumber(t.P_QTY), negative: () => false },
  { key: "pv", label: "Estimated value (PKR)", align: "right", sortValue: (r) => numeric(r.P_VALUE), render: (r) => money(r.P_VALUE), total: (t) => formatPkr(t.P_VALUE), negative: () => false },
  { key: "pr", label: "Planned rate (PKR)", align: "right", sortValue: (r) => numeric(r.P_RATE), render: (r) => formatNumber(r.P_RATE), negative: () => false },
  { key: "iq", label: "Actual qty", align: "right", sortValue: (r) => numeric(r.I_QTY), render: (r) => formatNumber(r.I_QTY), total: (t) => formatNumber(t.I_QTY), negative: () => false },
  { key: "iv", label: "Actual value (PKR)", align: "right", sortValue: (r) => numeric(r.I_VALUE), render: (r) => money(r.I_VALUE), total: (t) => formatPkr(t.I_VALUE), negative: () => false },
  { key: "ir", label: "Actual rate (PKR)", align: "right", sortValue: (r) => numeric(r.I_RATE), render: (r) => formatNumber(r.I_RATE), negative: () => false },
  { key: "iss", label: "Issued vs planned qty", align: "right", sortValue: (r) => numeric(r.ISS_VS_PLAN_QTY_PRCNT), render: (r) => formatPercent(r.ISS_VS_PLAN_QTY_PRCNT), negative: (r) => isNeg(r.ISS_VS_PLAN_QTY_PRCNT) },
  {
    key: "pl",
    label: "Profit or loss (PKR)",
    align: "right",
    sortValue: (r) => numeric(r.profit_loss_pkr),
    render: (r) => (r.profit_loss_pkr ? `${formatPkr(String(r.profit_loss_pkr))}${r.profit_loss_pct ? ` (${formatNumber(r.profit_loss_pct)}%)` : ""}` : EMPTY),
    total: (t) => formatPkr(t.profit_loss_pkr),
    negative: (r) => isNeg(r.profit_loss_pkr),
  },
  { key: "pvi", label: "Planned value on issued qty (PKR)", align: "right", sortValue: (r) => numeric(r.P_VALUE_WRT_ISS), render: (r) => money(r.P_VALUE_WRT_ISS), total: (t) => formatPkr(t.P_VALUE_WRT_ISS), negative: () => false },
  { key: "piv", label: "Plan minus issued (PKR)", align: "right", sortValue: (r) => numeric(r.plan_vs_issued_pkr), render: (r) => money(r.plan_vs_issued_pkr), total: (t) => formatPkr(t.plan_vs_issued_pkr), negative: (r) => isNeg(r.plan_vs_issued_pkr) },
  { key: "rd", label: "Rate difference", align: "right", sortValue: (r) => numeric(r.rate_difference), render: (r) => formatNumber(r.rate_difference), negative: (r) => isNeg(r.rate_difference) },
];

export function greyDetailFields(r: Row): DetailField[] {
  const pkr = (v: unknown) => (v === null || v === undefined || v === "" ? EMPTY : formatPkr(String(v)));
  return [
    ["Customer", String(r.BUYER_ID ?? EMPTY)],
    ["Manager", String(r.MNGR ?? EMPTY)],
    ["Order type", String(r.SO_TYPE ?? EMPTY)],
    ["Grey status", String(r.GREY_CLOSE_STATUS ?? EMPTY)],
    ["Grey close date", formatDate(r.GREY_CLOSE_DATE)],
    ["Grey issue days", formatNumber(r.GREY_ISSUE_DAYS)],
    ["Shipment status", String(r.SHIPMENT_CLOSE_STATUS ?? EMPTY)],
    ["Shipment close date", formatDate(r.SHIPMENT_CLOSE_DATE)],
    ["Estimated qty", formatNumber(r.P_QTY)],
    ["Estimated value", pkr(r.P_VALUE)],
    ["Planned rate (PKR)", formatNumber(r.P_RATE)],
    ["Planned value on issued qty", pkr(r.P_VALUE_WRT_ISS)],
    ["Actual qty", formatNumber(r.I_QTY)],
    ["Actual value", pkr(r.I_VALUE)],
    ["Actual rate (PKR)", formatNumber(r.I_RATE)],
    ["Issued vs planned qty", formatPercent(r.ISS_VS_PLAN_QTY_PRCNT)],
    ["Profit or loss", pkr(r.profit_loss_pkr)],
    ["Profit or loss, percent of estimate", r.profit_loss_pct ? `${formatNumber(r.profit_loss_pct)}%` : EMPTY],
    ["Plan minus issued", pkr(r.plan_vs_issued_pkr)],
    ["Rate difference (PKR)", formatNumber(r.rate_difference)],
  ];
}
