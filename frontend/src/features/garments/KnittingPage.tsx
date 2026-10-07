import { GarmentPage } from "./GarmentPage";
import { KNIT_COLUMNS, KNIT_DEFAULT_KEYS, KNIT_SUM_FIELDS, knitDetailFields } from "./knittingColumns";

const CHIPS = [
  { key: "all", label: "All" },
  { key: "profit", label: "Profit" },
  { key: "loss", label: "Loss" },
  { key: "grey_complete", label: "Completed" },
  { key: "grey_incomplete", label: "Incomplete" },
  { key: "no_issue_cost", label: "No knitting yet" },
];

export function KnittingPage() {
  return (
    <GarmentPage
      config={{
        title: "Knitting: estimated vs actual",
        subtitle: "PKR, one row per quality and PO",
        base: "/garments/knitting",
        columns: KNIT_COLUMNS,
        defaultKeys: KNIT_DEFAULT_KEYS,
        sumFields: KNIT_SUM_FIELDS,
        chips: CHIPS,
        detailTitle: (r) => `${String(r.CNTRCT_NO)}, ${String(r.QLTY ?? "")}`,
        detailFields: knitDetailFields,
        unit: "lines",
        viewPage: "knitting",
      }}
    />
  );
}
