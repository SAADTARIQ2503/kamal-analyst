import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPkr } from "@/lib/format";

export default function StageChart({ stages }: { stages: { label: string; saving: number }[] }) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b border-border py-4">
        <CardTitle className="text-sm font-medium">Net against estimate by stage (PKR)</CardTitle>
      </CardHeader>
      <CardContent className="py-6">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stages} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
              <YAxis tickFormatter={(v: number) => formatPkr(v)} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} stroke="var(--border)" width={110} />
              <Tooltip formatter={(v) => `${formatPkr(String(v))} PKR`} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }} labelStyle={{ color: "var(--foreground)" }} itemStyle={{ color: "var(--foreground)" }} cursor={{ fill: "var(--muted)" }} />
              <Bar dataKey="saving" name="Net" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {stages.map((s) => (
                  <Cell key={s.label} fill={s.saving >= 0 ? "var(--positive)" : "var(--negative)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
