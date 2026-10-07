import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { EMPTY } from "@/lib/format";
import { downloadCsv, toCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { sumMoney } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { flatten, isComparable, matchesChip, type Flat, type Row } from "./groupRows";
import { PoDetails, type DetailField } from "./PoDetails";
import type { Col } from "./tableTypes";

const ROW_HEIGHT = 40;

type Props = {
  rows: Row[];
  chip: string;
  columns: Col[];
  sumFields: readonly string[];
  label: string;
  detailTitle: (r: Row) => string;
  detailFields: (r: Row) => DetailField[];
  groupKey?: string;
  rowUnit?: string;
};

function sortRows(rows: Row[], col: Col | undefined, dir: "asc" | "desc"): Row[] {
  if (!col) return rows;
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = col.sortValue(a);
    const y = col.sortValue(b);
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    if (typeof x === "number" && typeof y === "number") return (x - y) * sign;
    return String(x).localeCompare(String(y)) * sign;
  });
}

export function PoTable({ rows, chip, columns, sumFields, label, detailTitle, detailFields, groupKey = "BUYER_ID", rowUnit = "POs" }: Props) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const chipRows = useMemo(() => rows.filter((r) => matchesChip(r, chip)), [rows, chip]);
  const sorted = useMemo(() => sortRows(chipRows, columns.find((c) => c.key === sort?.key), sort?.dir ?? "asc"), [chipRows, columns, sort]);
  const grouped: Flat[] = useMemo(() => flatten(sorted, "all", sumFields, groupKey), [sorted, sumFields, groupKey]);
  const grand = useMemo(() => {
    const totals: Record<string, string> = {};
    const comparable = chipRows.filter(isComparable);
    for (const f of sumFields) totals[f] = sumMoney(comparable.map((r) => (r[f] === null || r[f] === undefined ? null : String(r[f])))).toFixed(2);
    return { totals, comparable: comparable.length };
  }, [chipRows, sumFields]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: grouped.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });
  const items = virtualizer.getVirtualItems();
  const padTop = items.length ? items[0].start : 0;
  const padBottom = items.length ? virtualizer.getTotalSize() - items[items.length - 1].end : 0;

  const exportCsv = () => {
    const headers = columns.map((c) => c.label);
    const body = flatten(sorted, "all", sumFields, groupKey)
      .filter((f): f is Extract<Flat, { kind: "po" }> => f.kind === "po")
      .map((f) => columns.map((c) => c.render(f.row)));
    downloadCsv(`${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`, toCsv(headers, body));
  };

  const toggleSort = (key: string) => {
    setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  };

  return (
    <>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={sorted.length === 0}>
          Export CSV
        </Button>
      </div>
      <div ref={scrollRef} className="max-h-[36rem] overflow-auto rounded-lg border border-border bg-card">
        <table aria-label={label} className="w-full min-w-max border-collapse text-sm tabular-nums">
          <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground">
            <tr>
              {columns.map((c, i) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort?.dir === "asc" ? "ascending" : "descending") : "none"}
                    className={cn("border-b border-border px-4 py-3 font-medium whitespace-nowrap", i === 0 && "sticky left-0 z-[1] bg-card")}
                  >
                    <button type="button" onClick={() => toggleSort(c.key)} className={cn("inline-flex items-center gap-1 hover:text-foreground", c.align === "right" && "flex-row-reverse")}>
                      {c.label}
                      <span aria-hidden="true" className="w-3 text-foreground">{active ? (sort?.dir === "asc" ? "▲" : "▼") : ""}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {padTop > 0 && (
              <tr aria-hidden="true">
                <td style={{ height: padTop }} />
              </tr>
            )}
            {items.map((vi) => {
              const item = grouped[vi.index];
              if (item.kind === "group") {
                return (
                  <tr key={item.key} className="bg-muted/60" style={{ height: ROW_HEIGHT }}>
                    <th scope="rowgroup" colSpan={columns.length} className="px-4 text-left font-medium">
                      {item.buyer} <span className="ml-2 text-xs font-normal text-muted-foreground">{item.count} {rowUnit}</span>
                    </th>
                  </tr>
                );
              }
              if (item.kind === "subtotal") {
                return (
                  <tr key={item.key} className="border-b border-border font-medium" style={{ height: ROW_HEIGHT }}>
                    {columns.map((c, i) => (
                      <td key={c.key} className={cn("px-4 py-2 whitespace-nowrap", c.align === "right" && "text-right", i === 0 && "sticky left-0 bg-card")}>
                        {i === 0 ? `Total, ${item.buyer}` : c.total ? c.total(item.totals) : ""}
                      </td>
                    ))}
                  </tr>
                );
              }
              return (
                <tr
                  key={item.key}
                  onClick={() => setSelected(item.row)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setSelected(item.row);
                  }}
                  tabIndex={0}
                  aria-label={`Open details for ${String(item.row.CNTRCT_NO)}`}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/60"
                  style={{ height: ROW_HEIGHT }}
                >
                  {columns.map((c, i) => (
                    <td key={c.key} className={cn("px-4 py-2 whitespace-nowrap", c.align === "right" && "text-right", c.negative(item.row) && "text-negative", i === 0 && "sticky left-0 bg-card font-medium")}>
                      {c.render(item.row)}
                    </td>
                  ))}
                </tr>
              );
            })}
            {padBottom > 0 && (
              <tr aria-hidden="true">
                <td style={{ height: padBottom }} />
              </tr>
            )}
          </tbody>
          <tfoot className="sticky bottom-0 bg-card font-semibold">
            <tr className="border-t border-border">
              {columns.map((c, i) => (
                <td key={c.key} className={cn("px-4 py-3 whitespace-nowrap", c.align === "right" && "text-right")}>
                  {i === 0 ? `Total, ${grand.comparable} ${rowUnit} with both values` : c.total ? c.total(grand.totals) : EMPTY}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <PoDetails row={selected} title={selected ? detailTitle(selected) : ""} fields={detailFields} onClose={() => setSelected(null)} />
    </>
  );
}
