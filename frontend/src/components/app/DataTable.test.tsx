import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataTable } from "./DataTable";

describe("DataTable", () => {
  it("shows labels, formatted money and dashes for null values", () => {
    render(
      <DataTable
        label="Test table"
        keys={["CNTRCT_NO", "P_VALUE", "I_VALUE"]}
        rows={[
          { CNTRCT_NO: "KTM-1", P_VALUE: "1000.5", I_VALUE: null },
        ]}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "Estimated cost (PKR)" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "1,001" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "–" })).toBeInTheDocument();
    expect(screen.queryByText("P_VALUE")).not.toBeInTheDocument();
  });
});
