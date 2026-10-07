import { useState } from "react";
import Decimal from "decimal.js";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Figure } from "@/components/app/Metric";
import { ApiError, apiRequest } from "@/lib/api";
import { EMPTY, formatPkr } from "@/lib/format";
import { savingPercent } from "@/lib/metrics";
import { askSchema, summarySchema, type GreyIssuance } from "@/lib/schemas";
import { buildInsights } from "./insights";

type Props = { data: GreyIssuance; filters: Record<string, string>; onView: (po: string) => void; base: string };

const PRIORITY: Record<string, string> = { HIGH: "High", MEDIUM: "Medium", LOW: "Low" };

function errorText(error: unknown, fallback: string): string | null {
  if (!error) return null;
  return error instanceof ApiError ? error.message : fallback;
}

export function ExecutiveReport({ data, filters, onView, base }: Props) {
  const [question, setQuestion] = useState("");
  const insights = buildInsights(data);
  const s = data.summary;
  const pct = savingPercent(s.saving_pkr, s.estimated_pkr);

  const actions = useMutation({
    mutationFn: () => apiRequest(`${base}/summary`, summarySchema, { method: "POST", body: filters }),
  });
  const ask = useMutation({
    mutationFn: (q: string) => apiRequest(`${base}/ask`, askSchema, { method: "POST", body: { question: q, filters } }),
  });

  return (
    <section aria-labelledby="exec-heading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 id="exec-heading" className="text-lg font-semibold">Executive report</h2>
        <p className="text-sm text-muted-foreground">Figures are computed from the data. Written text is checked against them.</p>
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b border-border py-4">
          <CardTitle className="text-sm font-medium">Insights</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border py-0">
          {insights.map((i) => (
            <div key={i.title} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-1">
                <p className="font-medium">{i.title}</p>
                <p className="text-sm text-muted-foreground">{i.body}</p>
              </div>
              {i.po && (
                <Button variant="outline" size="sm" onClick={() => onView(i.po!)}>
                  View {i.po}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border py-4">
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-sm font-medium">How to improve</CardTitle>
            <p className="text-xs text-muted-foreground">Written from the figures on this page.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => actions.mutate()} disabled={actions.isPending}>
            {actions.isPending ? "Writing" : actions.data ? "Write again" : "Write actions"}
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 py-4">
          {errorText(actions.error, "The actions could not be written.") && (
            <p role="alert" className="text-sm text-destructive">{errorText(actions.error, "")}</p>
          )}
          {actions.data ? (
            <>
              <p className="font-medium">{actions.data.headline}</p>
              <ol className="flex flex-col gap-3">
                {actions.data.actions.map((a) => (
                  <li key={a.title} className="flex flex-col gap-1 border-l-2 border-border pl-3">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">{PRIORITY[a.priority] ?? a.priority} priority</span>
                    <span className="font-medium">{a.title}</span>
                    <span className="text-sm text-muted-foreground">{a.detail}</span>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            !actions.isPending && <p className="text-sm text-muted-foreground">No actions written for the current filters yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b border-border py-4">
          <CardTitle className="text-sm font-medium">Closing summary</CardTitle>
        </CardHeader>
        <CardContent className="py-0">
          <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
            <Figure label="Estimated" value={formatPkr(s.estimated_pkr)} note="PKR" />
            <Figure label="Actual" value={formatPkr(s.actual_pkr)} note="PKR" />
            <Figure
              label="Saving against estimate"
              value={`${new Decimal(s.saving_pkr).isNegative() ? "" : "+"}${formatPkr(s.saving_pkr)}`}
              note={pct === null ? EMPTY : `PKR, ${new Decimal(s.saving_pkr).isNegative() ? "" : "+"}${pct}%`}
              tone={new Decimal(s.saving_pkr).isNegative() ? "negative" : "positive"}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b border-border py-4">
          <CardTitle className="text-sm font-medium">Ask about this report</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 py-4">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (question.trim().length >= 3) ask.mutate(question.trim());
            }}
          >
            <div className="flex w-full flex-col gap-1.5">
              <Label htmlFor="ask-question">Question</Label>
              <Input id="ask-question" placeholder="For example, which manager has the most actual cost?" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={300} />
            </div>
            <Button type="submit" disabled={ask.isPending || question.trim().length < 3}>
              {ask.isPending ? "Asking" : "Ask"}
            </Button>
          </form>
          {errorText(ask.error, "The question could not be answered.") && (
            <p role="alert" className="text-sm text-destructive">{errorText(ask.error, "")}</p>
          )}
          {ask.data && <p className="text-sm">{ask.data.answer}</p>}
        </CardContent>
      </Card>
    </section>
  );
}
