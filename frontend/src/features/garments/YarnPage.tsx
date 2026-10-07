import { GarmentPage } from "./GarmentPage";
import { YARN_COLUMNS, YARN_DEFAULT_KEYS, YARN_SUM_FIELDS, yarnDetailFields } from "./yarnColumns";

const CHIPS = [
  { key: "all", label: "All" },
  { key: "profit", label: "Profit" },
  { key: "loss", label: "Loss" },
  { key: "grey_complete", label: "Completed" },
  { key: "grey_incomplete", label: "Incomplete" },
];

export function YarnPage() {
  return (
    <GarmentPage
      config={{
        title: "Yarn purchase: estimated vs actual",
        subtitle: "PKR, one row per yarn count and PO",
        base: "/garments/yarn",
        columns: YARN_COLUMNS,
        defaultKeys: YARN_DEFAULT_KEYS,
        sumFields: YARN_SUM_FIELDS,
        chips: CHIPS,
        detailTitle: (r) => `${String(r.CNTRCT_NO)}, ${String(r.YCOUNT ?? "")}`,
        detailFields: yarnDetailFields,
        unit: "lines",
        viewPage: "yarn",
      }}
    />
  );
}
