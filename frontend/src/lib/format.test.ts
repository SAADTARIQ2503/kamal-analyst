import { describe, expect, it } from "vitest";
import { EMPTY, formatDate, formatPkr } from "./format";
import { columnMeta } from "./labels";

describe("formatPkr", () => {
  it("shows a dash for unknown values, never zero", () => {
    expect(formatPkr(null)).toBe(EMPTY);
    expect(formatPkr(undefined)).toBe(EMPTY);
    expect(formatPkr("")).toBe(EMPTY);
  });

  it("groups whole rupees and does not use floats for the decimal string", () => {
    expect(formatPkr("2423906579.331")).toBe("2,423,906,579");
    expect(formatPkr("-358667172.429")).toBe("-358,667,172");
  });
});

describe("formatDate", () => {
  it("formats ISO dates and leaves unknown dates as a dash", () => {
    expect(formatDate("2026-10-05T00:00:00")).toBe("05 Oct 2026");
    expect(formatDate(null)).toBe(EMPTY);
  });
});

describe("columnMeta", () => {
  it("uses the label map for known columns", () => {
    expect(columnMeta("I_VALUE")).toEqual({ label: "Actual cost (PKR)", kind: "pkr" });
  });

  it("never returns the raw column name for unknown columns", () => {
    expect(columnMeta("SOME_NEW_COLUMN").label).toBe("Some new column");
  });
});
