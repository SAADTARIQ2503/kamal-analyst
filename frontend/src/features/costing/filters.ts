import { z } from "zod";

export const filterSchema = z
  .object({
    from_date: z.string(),
    to_date: z.string(),
    po: z.string().trim().max(64),
    manager: z.string().max(64),
    order_type: z.string().max(64),
    grey_status: z.string().max(64),
    shipment_status: z.string().max(64),
    shipment_close_date: z.string(),
  })
  .refine((v) => !v.from_date || !v.to_date || v.from_date <= v.to_date, {
    message: "The To date must be after the From date.",
    path: ["to_date"],
  });

export type GreyFilterValues = z.infer<typeof filterSchema>;

export const emptyFilters: GreyFilterValues = {
  from_date: "",
  to_date: "",
  po: "",
  manager: "",
  order_type: "",
  grey_status: "",
  shipment_status: "",
  shipment_close_date: "",
};

export function toQuery(filters: GreyFilterValues): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
