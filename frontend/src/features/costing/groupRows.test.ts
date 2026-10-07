import { describe, expect, it } from "vitest";
import { flatten, matchesChip, type Row } from "./groupRows";
import { buildInsights } from "./insights";
import type { GreyIssuance } from "@/lib/schemas";

const rows = [
  { CNTRCT_NO: "KTM-1", BUYER_ID: "B", P_VALUE: "100", I_VALUE: "80", profit_loss_pkr: "20", GREY_CLOSE_STATUS: "CLOSE", SHIPMENT_CLOSE_STATUS: "SHIPPED" },
  { CNTRCT_NO: "KTM-2", BUYER_ID: "A", P_VALUE: "50", I_VALUE: "70", profit_loss_pkr: "-20", GREY_CLOSE_STATUS: "RUNNING", SHIPMENT_CLOSE_STATUS: "RUNNING" },
  { CNTRCT_NO: "KTM-3", BUYER_ID: "A", P_VALUE: "200", I_VALUE: null, profit_loss_pkr: null, GREY_CLOSE_STATUS: "RUNNING", SHIPMENT_CLOSE_STATUS: "RUNNING" },
] as GreyIssuance["rows"];

describe("chips", () => {
  it("splits profit, loss and missing actuals", () => {
    expect(matchesChip(rows[0], "profit")).toBe(true);
    expect(matchesChip(rows[1], "loss")).toBe(true);
    expect(matchesChip(rows[2], "no_issue_cost")).toBe(true);
    expect(matchesChip(rows[2], "profit")).toBe(false);
  });
});

describe("grouping", () => {
  it("groups POs by customer in name order with subtotals that add up", () => {
    const flat = flatten(rows, "all");
    expect(flat.map((f) => f.kind)).toEqual(["group", "po", "po", "subtotal", "group", "po", "subtotal"]);
    const subA = flat[3];
    if (subA.kind !== "subtotal") throw new Error("expected subtotal");
    expect(subA.buyer).toBe("A");
    expect(subA.totals.P_VALUE).toBe("50.00");
    expect(subA.totals.I_VALUE).toBe("70.00");
    expect(subA.totals.profit_loss_pkr).toBe("-20.00");
  });

  it("applies the chip before grouping", () => {
    const flat = flatten(rows, "profit");
    expect(flat.filter((f) => f.kind === "po")).toHaveLength(1);
  });
});

describe("insights", () => {
  it("names the largest overspend and saving with the PO code", () => {
    const data = {
      summary: { po_count: 3, estimated_pkr: "350", actual_pkr: "170", saving_pkr: "180", over_budget: 1, within_budget: 0, under_budget: 1, unknown: 1 },
      report: {
        biggest_overrun: { po: "KTM-2", manager: "A", amount_pkr: "-20" },
        biggest_saving: { po: "KTM-1", manager: "B", amount_pkr: "20" },
      },
    } as unknown as GreyIssuance;
    const texts = buildInsights(data);
    expect(texts.find((t) => t.title.startsWith("Largest overspend"))?.po).toBe("KTM-2");
    expect(texts.find((t) => t.title.startsWith("Largest saving"))?.po).toBe("KTM-1");
  });
});

describe("process chips", () => {
  it("filters lines by process name", () => {
    const row = { ...rows[0], PRCS: "Flat Bed" } as Row;
    expect(matchesChip(row, "process:Flat Bed")).toBe(true);
    expect(matchesChip(row, "process:Bleach")).toBe(false);
  });
});
