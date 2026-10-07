import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, ApiError } from "@/lib/api";
import { meSchema } from "@/lib/schemas";
import { ThemeToggle } from "@/components/app/ThemeToggle";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Enter your username."),
  password: z.string().min(1, "Enter your password."),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const login = useMutation({
    mutationFn: (values: LoginValues) => apiRequest("/login", meSchema, { method: "POST", body: values }),
    onSuccess: async (me) => {
      queryClient.setQueryData(["me"], me);
      await navigate({ to: "/costing/grey-issuance" });
    },
  });

  const serverError = login.error instanceof ApiError ? login.error.message : login.error ? "Sign in failed." : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4">
      <ThemeToggle />
      <Card className="w-full max-w-sm gap-4 py-6">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Sign in</CardTitle>
          <p className="text-sm text-muted-foreground">Kamal Analyst, costing department.</p>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => login.mutate(v))} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">Username</Label>
              <Input id="username" autoComplete="username" aria-invalid={!!form.formState.errors.username} {...form.register("username")} />
              {form.formState.errors.username && (
                <p className="text-sm text-destructive">{form.formState.errors.username.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!form.formState.errors.password}
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
            {serverError && (
              <p role="alert" className="text-sm text-destructive">
                {serverError}
              </p>
            )}
            <Button type="submit" disabled={login.isPending}>
              {login.isPending ? "Signing in" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
