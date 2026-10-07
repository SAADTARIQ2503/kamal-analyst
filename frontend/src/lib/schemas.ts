import { z } from "zod";

export const meSchema = z.object({ username: z.string() });

export const costSummarySchema = z.object({
  po_count: z.number().int(),
  estimated_pkr: z.string(),
  actual_pkr: z.string(),
  saving_pkr: z.string(),
  over_budget: z.number().int(),
  within_budget: z.number().int(),
  under_budget: z.number().int(),
  unknown: z.number().int(),
});

const poAmountSchema = z.object({ po: z.string(), manager: z.string(), amount_pkr: z.string() });

export const reportSchema = z.object({
  profit_pkr: z.string(),
  profit_pos: z.number().int(),
  loss_pkr: z.string(),
  loss_pos: z.number().int(),
  biggest_saving: poAmountSchema.nullable(),
  biggest_overrun: poAmountSchema.nullable(),
  chips: z.record(z.string(), z.number().int()),
  manager_actuals: z.array(z.object({ manager: z.string(), actual_pkr: z.string(), po_count: z.number().int() })),
});

export const greyIssuanceSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.record(z.string(), z.unknown())),
  options: z.record(z.string(), z.array(z.string())),
  summary: costSummarySchema,
  total_rows: z.number().int(),
  excluded_rows: z.number().int(),
  confidence_pct: z.number().int().nullable(),
  period_start: z.string().nullable(),
  period_end: z.string().nullable(),
  report: reportSchema,
  row_limit_reached: z.boolean(),
});

export const summarySchema = z.object({
  headline: z.string(),
  actions: z.array(z.object({ priority: z.string(), title: z.string(), detail: z.string() })),
});

export const askSchema = z.object({ answer: z.string() });

export const queryResultSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(z.unknown())),
  row_limit_reached: z.boolean(),
});

export type GreyIssuance = z.infer<typeof greyIssuanceSchema>;
export type CostSummary = z.infer<typeof costSummarySchema>;
export type QueryResult = z.infer<typeof queryResultSchema>;
export type Summary = z.infer<typeof summarySchema>;
export type Report = z.infer<typeof reportSchema>;
