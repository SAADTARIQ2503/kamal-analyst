import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/app/DataTable";
import { ApiError, apiRequest } from "@/lib/api";
import { queryResultSchema, type QueryResult } from "@/lib/schemas";
import { GREY_ISSUANCE_SQL } from "./greySql";

function toRows(result: QueryResult): Record<string, unknown>[] {
  return result.rows.map((cells) => Object.fromEntries(result.columns.map((c, i) => [c, cells[i]])));
}

export function SqlEditor() {
  const [open, setOpen] = useState(false);
  const [sql, setSql] = useState(GREY_ISSUANCE_SQL);

  const run = useMutation({
    mutationFn: (text: string) => apiRequest("/query", queryResultSchema, { method: "POST", body: { sql: text } }),
  });

  const error = run.error instanceof ApiError ? run.error.message : run.error ? "The query did not run." : null;

  return (
    <Card>
      <CardHeader>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="sql-editor-body"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <CardTitle className="text-sm font-medium">SQL editor</CardTitle>
          <span className="text-sm text-muted-foreground">{open ? "Hide" : "Show"}</span>
        </button>
      </CardHeader>
      {open && (
        <CardContent id="sql-editor-body" className="flex flex-col gap-4">
          <label htmlFor="sql-text" className="text-sm font-medium">
            Query (read only, one SELECT statement)
          </label>
          <textarea
            id="sql-text"
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            spellCheck={false}
            rows={12}
            className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs leading-relaxed focus-visible:outline-2 focus-visible:outline-ring"
          />
          <div className="flex items-center gap-3">
            <Button onClick={() => run.mutate(sql)} disabled={run.isPending || !sql.trim()}>
              {run.isPending ? "Running" : "Run"}
            </Button>
            <Button variant="outline" onClick={() => setSql(GREY_ISSUANCE_SQL)}>
              Reset
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {run.data && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground tabular">
                {run.data.rows.length} rows{run.data.row_limit_reached ? ", row limit reached" : ""}
              </p>
              <DataTable keys={run.data.columns} rows={toRows(run.data)} label="Query results" />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
