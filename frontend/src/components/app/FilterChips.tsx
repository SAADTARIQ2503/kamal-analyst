import { X } from "lucide-react";

export type ActiveFilter = { key: string; label: string; value: string };

export function FilterChips({ filters, onRemove, onClear }: { filters: ActiveFilter[]; onRemove: (key: string) => void; onClear: () => void }) {
  if (filters.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Applied filters">
      <span className="text-sm text-muted-foreground">Filtered by</span>
      {filters.map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={() => onRemove(f.key)}
          aria-label={`Remove ${f.label} filter ${f.value}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span className="text-muted-foreground">{f.label}:</span>
          <span className="font-medium tabular">{f.value}</span>
          <X className="size-3.5 text-muted-foreground" aria-hidden="true" />
        </button>
      ))}
      <button type="button" onClick={onClear} className="text-sm text-primary underline-offset-2 hover:underline">
        Clear all
      </button>
    </div>
  );
}
