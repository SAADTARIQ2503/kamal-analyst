import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ApiError, apiPost, apiRequest } from "@/lib/api";

const viewsSchema = z.array(z.object({ id: z.number().int(), name: z.string(), filters: z.record(z.string(), z.string()) }));

export function SavedViews({ page, filters, onApply }: { page: string; filters: Record<string, string>; onApply: (f: Record<string, string>) => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState("");
  const views = useQuery({ queryKey: ["views", page], queryFn: () => apiRequest(`/views?page=${page}`, viewsSchema) });

  const save = useMutation({
    mutationFn: () => apiRequest("/views", z.object({ id: z.number() }), { method: "POST", body: { page, name: name.trim(), filters } }),
    onSuccess: async () => {
      setName("");
      await queryClient.invalidateQueries({ queryKey: ["views", page] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: number) => apiPost(`/views/${id}`, "DELETE"),
    onSuccess: async () => {
      setSelected("");
      await queryClient.invalidateQueries({ queryKey: ["views", page] });
    },
  });

  const error = [save.error, remove.error, views.error].find(Boolean);
  const list = views.data ?? [];
  const chosen = list.find((v) => String(v.id) === selected);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`views-${page}`}>Saved views</Label>
          <Select id={`views-${page}`} value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">{list.length ? "Choose a view" : "No saved views yet"}</option>
            {list.map((v) => (
              <option key={v.id} value={String(v.id)}>
                {v.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={!chosen} onClick={() => chosen && onApply(chosen.filters)}>
            Apply view
          </Button>
          <Button type="button" variant="outline" disabled={!chosen || remove.isPending} onClick={() => chosen && remove.mutate(chosen.id)}>
            Delete
          </Button>
        </div>
      </div>
      <form
        className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) save.mutate();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`view-name-${page}`}>Save current filters as</Label>
          <Input id={`view-name-${page}`} placeholder="For example, Muzzamil, October" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </div>
        <Button type="submit" variant="outline" disabled={!name.trim() || save.isPending}>
          {save.isPending ? "Saving" : "Save view"}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">A view with no filters saves as All.</p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error instanceof ApiError ? error.message : "The saved view could not be updated."}
        </p>
      )}
    </div>
  );
}
