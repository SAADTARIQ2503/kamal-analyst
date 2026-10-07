import { z } from "zod";

export const processFilterSchema = z
  .object({
    from_date: z.string(),
    to_date: z.string(),
    po: z.string().trim().max(64),
    manager: z.string().max(64),
    process: z.string().max(128),
    party_type: z.enum(["", "in_house", "commercial"]),
  })
  .refine((v) => !v.from_date || !v.to_date || v.from_date <= v.to_date, {
    message: "The To date must be after the From date.",
    path: ["to_date"],
  });

export type ProcessFilterValues = z.infer<typeof processFilterSchema>;

export const emptyProcessFilters: ProcessFilterValues = {
  from_date: "",
  to_date: "",
  po: "",
  manager: "",
  process: "",
  party_type: "",
};

export function processQuery(filters: ProcessFilterValues): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
