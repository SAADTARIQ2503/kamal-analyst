import { cn } from "@/lib/utils";

export type Tone = "positive" | "negative" | "neutral" | "warning";

const toneText: Record<Tone, string> = {
  positive: "text-positive",
  negative: "text-negative",
  neutral: "text-foreground",
  warning: "text-warning",
};

const toneDot: Record<Tone, string> = {
  positive: "bg-positive",
  negative: "bg-negative",
  neutral: "bg-info",
  warning: "bg-warning",
};

export function Figure({ label, value, note, emphasis, tone = "neutral" }: { label: string; value: string; note: string; emphasis?: boolean; tone?: Tone }) {
  return (
    <div className="flex flex-col gap-1 px-6 py-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("tabular", emphasis ? "text-2xl font-semibold" : "text-xl font-medium", toneText[tone])}>{value}</span>
      <span className="text-xs text-muted-foreground">{note}</span>
    </div>
  );
}

export function CountRow({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-6 py-3">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <span aria-hidden="true" className={cn("inline-block size-2 rounded-full", toneDot[tone])} />
        {label}
      </span>
      <span className="tabular text-sm font-medium">
        {value} <span className="text-xs font-normal text-muted-foreground">POs</span>
      </span>
    </div>
  );
}
