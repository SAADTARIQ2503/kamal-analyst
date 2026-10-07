import type { ActiveFilter } from "@/components/app/FilterChips";

export function toActive(values: Record<string, string>, labels: Record<string, string>): ActiveFilter[] {
  return Object.entries(labels)
    .filter(([key]) => values[key])
    .map(([key, label]) => ({ key, label, value: values[key] }));
}
