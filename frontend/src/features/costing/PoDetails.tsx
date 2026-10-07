import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Row } from "./groupRows";

export type DetailField = [string, string];

export function PoDetails({ row, title, fields, onClose }: { row: Row | null; title: string; fields: (r: Row) => DetailField[]; onClose: () => void }) {
  return (
    <Dialog open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        {row && (
          <>
            <DialogHeader>
              <DialogTitle className="tabular">{title}</DialogTitle>
              <DialogDescription>All figures for this line. Money in PKR.</DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-2 text-sm">
              {fields(row).map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right tabular">{value}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
