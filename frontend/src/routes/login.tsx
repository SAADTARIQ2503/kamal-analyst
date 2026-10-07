import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginPage } from "@/features/auth/LoginPage";
import { ApiError, apiRequest } from "@/lib/api";
import { meSchema } from "@/lib/schemas";

export const Route = createFileRoute("/login")({
  beforeLoad: async ({ context }) => {
    try {
      await context.queryClient.fetchQuery({
        queryKey: ["me"],
        queryFn: () => apiRequest("/me", meSchema),
        staleTime: 0,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return;
      throw error;
    }
    throw redirect({ to: "/costing/grey-issuance" });
  },
  component: LoginPage,
});
