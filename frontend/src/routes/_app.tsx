import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { ApiError, apiRequest } from "@/lib/api";
import { meSchema } from "@/lib/schemas";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context }) => {
    try {
      const me = await context.queryClient.fetchQuery({
        queryKey: ["me"],
        queryFn: () => apiRequest("/me", meSchema),
        staleTime: 5 * 60_000,
      });
      return { user: me.username };
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw redirect({ to: "/login" });
      }
      throw error;
    }
  },
  component: AppShell,
});
