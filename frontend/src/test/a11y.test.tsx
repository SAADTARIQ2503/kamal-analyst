import { render } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { FilterChips } from "@/components/app/FilterChips";
import { KpiStrip } from "@/components/app/KpiStrip";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { ThemeToggle } from "@/components/app/ThemeToggle";

async function violations(node: HTMLElement) {
  const result = await axe.run(node, { rules: { "color-contrast": { enabled: false } } });
  return result.violations.map((v) => `${v.id}: ${v.help}`);
}

describe("accessibility", () => {
  it("KPI strip has no axe violations", async () => {
    const { container } = render(<KpiStrip saving="100" estimated="1000" actual="900" over={1} under={2} />);
    expect(await violations(container)).toEqual([]);
  });

  it("filter chips have no axe violations", async () => {
    const { container } = render(<FilterChips filters={[{ key: "po", label: "PO", value: "KTM-1" }]} onRemove={() => {}} onClear={() => {}} />);
    expect(await violations(container)).toEqual([]);
  });

  it("theme toggle has no axe violations", async () => {
    const { container } = render(<ThemeToggle />);
    expect(await violations(container)).toEqual([]);
  });

  it("loading skeleton has no axe violations", async () => {
    const { container } = render(<PageSkeleton label="Loading" />);
    expect(await violations(container)).toEqual([]);
  });
});
