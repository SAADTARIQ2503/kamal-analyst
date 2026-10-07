import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Figure } from "@/components/app/Metric";
import { EMPTY, formatPkr } from "@/lib/format";
import { sumMoney } from "@/lib/metrics";
import type { GreyIssuance } from "@/lib/schemas";

export default function ManagerChart({ data }: { data: Pick<GreyIssuance, "report"> }) {
  const managers = data.report.manager_actuals;
  if (managers.length === 0) {
    return <p className="text-sm text-muted-foreground">{EMPTY}</p>;
  }
  const total = sumMoney(managers.map((m) => m.actual_pkr));
  const average = total.div(managers.length);
  const highest = managers[0];
  const lowest = managers[managers.length - 1];
  const chartData = managers.map((m) => ({ name: m.manager, value: Number(m.actual_pkr) }));

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b border-border py-4">
        <CardTitle className="text-sm font-medium">Actual cost by manager (PKR)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 py-6">
        <div className="grid grid-cols-2 divide-x divide-border rounded-lg border border-border md:grid-cols-4">
          <Figure label="Highest" value={formatPkr(highest.actual_pkr)} note={highest.manager} />
          <Figure label="Lowest" value={formatPkr(lowest.actual_pkr)} note={lowest.manager} />
          <Figure label="Total" value={formatPkr(total.toString())} note={`PKR, ${managers.length} managers`} />
          <Figure label="Average" value={formatPkr(average.toString())} note="PKR per manager" />
        </div>
        <div style={{ height: Math.max(160, managers.length * 32) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis type="number" tickFormatter={(v: number) => formatPkr(v)} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
              <Tooltip formatter={(v) => `${formatPkr(String(v))} PKR`} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }} labelStyle={{ color: "var(--foreground)" }} itemStyle={{ color: "var(--foreground)" }} cursor={{ fill: "var(--muted)" }} />
              <Bar dataKey="value" name="Actual" fill="var(--chart-1)" radius={[0, 4, 4, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
