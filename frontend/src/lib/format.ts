import Decimal from "decimal.js";

const pkrFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export const EMPTY = "–";

export function formatPkr(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return EMPTY;
  return pkrFormatter.format(new Decimal(value).toNumber());
}

export function formatNumber(value: unknown): string {
  if (value === null || value === undefined || value === "") return EMPTY;
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  return numberFormatter.format(n);
}

export function formatPercent(value: unknown): string {
  if (value === null || value === undefined || value === "") return EMPTY;
  return `${formatNumber(value)}%`;
}

export function formatDate(value: unknown): string {
  if (typeof value !== "string" || value === "") return EMPTY;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}
