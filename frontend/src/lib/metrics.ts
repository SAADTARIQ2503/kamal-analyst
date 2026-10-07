import Decimal from "decimal.js";

export function sumMoney(values: Array<string | null | undefined>): Decimal {
  return values.reduce<Decimal>((total, v) => (v === null || v === undefined || v === "" ? total : total.plus(v)), new Decimal(0));
}

export function savingPercent(saving: string, estimated: string): string | null {
  const est = new Decimal(estimated);
  if (est.isZero()) return null;
  return new Decimal(saving).div(est).times(100).toDecimalPlaces(1).toFixed(1);
}

export function completenessPercent(comparable: number, total: number): number | null {
  if (total === 0) return null;
  return Math.round((100 * comparable) / total);
}
