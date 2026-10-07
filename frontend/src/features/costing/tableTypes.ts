import type { Row } from "./groupRows";

export type Col = {
  key: string;
  label: string;
  align: "left" | "right";
  sortValue: (r: Row) => number | string | null;
  render: (r: Row) => string;
  total?: (t: Record<string, string>) => string | null;
  negative: (r: Row) => boolean;
};

export const numeric = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
export const isNeg = (v: unknown) => v !== null && v !== undefined && v !== "" && String(v).startsWith("-");
