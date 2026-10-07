export type ColumnKind = "text" | "date" | "pkr" | "qty" | "rate" | "percent";

export const COLUMN_LABELS: Record<string, { label: string; kind: ColumnKind }> = {
  MNGR: { label: "Manager", kind: "text" },
  BUYER_ID: { label: "Buyer", kind: "text" },
  SO_TYPE: { label: "Order type", kind: "text" },
  GREY_CLOSE_DATE: { label: "Grey close date", kind: "date" },
  GREY_CLOSE_STATUS: { label: "Grey status", kind: "text" },
  SHIPMENT_CLOSE_DATE: { label: "Shipment close date", kind: "date" },
  SHIPMENT_CLOSE_STATUS: { label: "Shipment status", kind: "text" },
  CNTRCT_NO: { label: "PO", kind: "text" },
  GREY_ISSUE_DAYS: { label: "Grey issue days", kind: "qty" },
  I_QTY: { label: "Issued qty", kind: "qty" },
  I_VALUE: { label: "Actual cost (PKR)", kind: "pkr" },
  I_RATE: { label: "Actual rate (PKR)", kind: "rate" },
  P_QTY: { label: "Planned qty", kind: "qty" },
  P_VALUE: { label: "Estimated cost (PKR)", kind: "pkr" },
  P_VALUE_WRT_ISS: { label: "Estimated cost on issued qty (PKR)", kind: "pkr" },
  P_RATE: { label: "Estimated rate (PKR)", kind: "rate" },
  ISS_VS_PLAN_QTY_PRCNT: { label: "Issued vs planned qty", kind: "percent" },
  ISS_VS_PLAN_RATE_DIFF: { label: "Rate difference (PKR)", kind: "rate" },
  ISS_VS_PLAN_VALUE_DIFF: { label: "Cost difference (PKR)", kind: "pkr" },
};

export function columnMeta(key: string) {
  const known = COLUMN_LABELS[key.toUpperCase()];
  if (known) return known;
  const words = key.toLowerCase().replace(/_/g, " ").trim();
  return { label: words.charAt(0).toUpperCase() + words.slice(1), kind: "text" as const };
}
