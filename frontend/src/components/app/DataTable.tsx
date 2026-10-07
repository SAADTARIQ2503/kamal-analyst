import { useRef } from "react";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { EMPTY, formatDate, formatNumber, formatPercent, formatPkr } from "@/lib/format";
import { columnMeta } from "@/lib/labels";
import { cn } from "@/lib/utils";

type Row = Record<string, unknown>;

const ROW_HEIGHT = 40;
const NUMERIC = ["pkr", "qty", "rate", "percent"];

function isNegative(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "" && Number(value) < 0;
}

function renderCell(kind: ReturnType<typeof columnMeta>["kind"], value: unknown): string {
  switch (kind) {
    case "date":
      return formatDate(value);
    case "pkr":
      return formatPkr(value as string | number | null);
    case "percent":
      return formatPercent(value);
    case "qty":
    case "rate":
      return formatNumber(value);
    default:
      return value === null || value === undefined || value === "" ? EMPTY : String(value);
  }
}

export function DataTable({ keys, rows, label }: { keys: string[]; rows: Row[]; label: string }) {
  const columns: ColumnDef<Row>[] = keys.map((key) => {
    const meta = columnMeta(key);
    return { id: key, accessorFn: (row) => row[key], header: meta.label };
  });
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });
  const scrollRef = useRef<HTMLDivElement>(null);
  const modelRows = table.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: modelRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });
  const items = virtualizer.getVirtualItems();
  const paddingTop = items.length ? items[0].start : 0;
  const paddingBottom = items.length ? virtualizer.getTotalSize() - items[items.length - 1].end : 0;
  const kindByKey = Object.fromEntries(keys.map((k) => [k, columnMeta(k).kind]));
  const pinFirst = (index: number) => (index === 0 ? "sticky left-0 z-[1] bg-card" : "");

  return (
    <div ref={scrollRef} className="max-h-[32rem] overflow-auto rounded-lg border border-border bg-card">
      <table aria-label={label} className="w-full min-w-max border-collapse text-sm tabular-nums">
        <thead className="sticky top-0 z-10 bg-card text-left text-xs text-muted-foreground">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  className={cn("border-b border-border px-4 py-3 font-medium whitespace-nowrap", NUMERIC.includes(kindByKey[header.id]) && "text-right", pinFirst(header.index))}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {paddingTop > 0 && (
            <tr aria-hidden="true">
              <td style={{ height: paddingTop }} />
            </tr>
          )}
          {items.map((vi) => {
            const row = modelRows[vi.index];
            return (
              <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/60" style={{ height: ROW_HEIGHT }}>
                {row.getVisibleCells().map((cell, index) => {
                  const kind = kindByKey[cell.column.id];
                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-4 py-2 whitespace-nowrap",
                        NUMERIC.includes(kind) && "text-right",
                        NUMERIC.includes(kind) && isNegative(cell.getValue()) && "text-negative",
                        pinFirst(index),
                      )}
                    >
                      {renderCell(kind, cell.getValue())}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {paddingBottom > 0 && (
            <tr aria-hidden="true">
              <td style={{ height: paddingBottom }} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
