import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { apiRequest } from "@/lib/api";
import { formatPkr } from "@/lib/format";
import { z } from "zod";

const trendSchema = z.object({
  months: z.array(z.object({ month: z.string(), po_count: z.number().int(), estimated_pkr: z.string(), actual_pkr: z.string(), saving_pkr: z.string() })),
});

export default function MonthlyTrend({ base, filters }: { base: string; filters: Record<string, string> }) {
  const query = useQuery({
    queryKey: ["trend", base, filters],
    queryFn: () => apiRequest(`${base}/trend`, trendSchema, { method: "POST", body: filters }),
  });

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b border-border py-4">
        <CardTitle className="text-sm font-medium">Saving by month (PKR)</CardTitle>
        <p className="text-xs text-muted-foreground">Months use the date of each line. Positive is a saving, negative is an overrun.</p>
      </CardHeader>
      <CardContent className="py-6">
        {query.isPending && <PageSkeleton label="Loading trend" />}
        {query.isError && <p role="alert" className="text-sm text-destructive">The trend could not be loaded.</p>}
        {query.data && query.data.months.length === 0 && <p className="text-sm text-muted-foreground">No dated lines for this filter.</p>}
        {query.data && query.data.months.length > 0 && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={query.data.months.map((m) => ({ month: m.month, value: Number(m.saving_pkr), pos: Number(m.saving_pkr) >= 0 }))} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
                <YAxis tickFormatter={(v: number) => formatPkr(v)} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} stroke="var(--border)" width={110} />
                <Tooltip formatter={(v) => `${formatPkr(String(v))} PKR`} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }} labelStyle={{ color: "var(--foreground)" }} itemStyle={{ color: "var(--foreground)" }} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="value" name="Net" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {query.data.months.map((m) => (
                    <Cell key={m.month} fill={Number(m.saving_pkr) >= 0 ? "var(--positive)" : "var(--negative)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
