import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

const departments = [
  { label: "Dashboard", to: "/dashboard" as const, prefix: "/dashboard" },
  { label: "Home Textile", to: "/costing/grey-issuance" as const, prefix: "/costing" },
  { label: "Garments", to: "/garments/yarn" as const, prefix: "/garments" },
  { label: "PO lifecycle", to: "/po" as const, prefix: "/po" },
];

const costingSections = [
  { label: "Costing", available: true },
  { label: "Power Usage", available: false },
];

const garmentSections = [
  { label: "Yarn Purchase", to: "/garments/yarn" as const },
  { label: "Knitting", to: "/garments/knitting" as const },
  { label: "Dyeing", to: null },
];

const steps = [
  { label: "Grey Issuance", to: "/costing/grey-issuance" as const },
  { label: "Processing", to: "/costing/processing" as const },
  { label: "Cut to Pack", to: "/costing/cut-to-pack" as const },
  { label: "Cutting & Stitching", to: null },
  { label: "Packing", to: null },
];

const STAGE_COLORS: Record<string, string> = {
  "/costing/grey-issuance": "var(--chart-1)",
  "/costing/processing": "var(--chart-2)",
  "/costing/cut-to-pack": "var(--chart-3)",
  "/garments/yarn": "var(--chart-5)",
  "/garments/knitting": "var(--chart-4)",
};

export function stageColor(pathname: string): string {
  const match = Object.keys(STAGE_COLORS).find((p) => pathname === p);
  return match ? STAGE_COLORS[match] : "var(--primary)";
}

function Soon() {
  return <span className="ml-1.5 text-xs text-muted-foreground">Soon</span>;
}

function UnderlineTab({ active, disabled, children }: { active: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <span
      aria-disabled={disabled || undefined}
      className={cn(
        "-mb-px inline-flex items-center border-b-2 px-3 py-2 text-sm whitespace-nowrap",
        active ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground",
        disabled && "opacity-70",
      )}
    >
      {children}
    </span>
  );
}

export function AppShell() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const inGarments = pathname.startsWith("/garments");
  const inStage = inGarments || pathname.startsWith("/costing");
  const stage = stageColor(pathname);
  const user = queryClient.getQueryData<{ username: string }>(["me"])?.username ?? "";

  const logout = useMutation({
    mutationFn: () => apiPost("/logout"),
    onSettled: async () => {
      queryClient.clear();
      await navigate({ to: "/login" });
    },
  });

  return (
    <div className="min-h-screen">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-foreground focus:shadow">
        Skip to content
      </a>
      <header className="bg-header text-header-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <span className="text-base font-semibold">Kamal Analyst</span>
          <div className="flex items-center gap-4">
            <ThemeToggle onHeader />
            <span className="text-sm opacity-80">{user}</span>
            <Button variant="outline" size="sm" onClick={() => logout.mutate()} disabled={logout.isPending} className="border-white/30 bg-transparent text-header-foreground hover:bg-white/10 hover:text-header-foreground">
              Log out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6">
        <nav aria-label="Departments" className="flex gap-2 border-b border-border">
          {departments.map((d) => {
            const active = pathname.startsWith(d.prefix);
            return (
              <Link key={d.label} to={d.to} className="no-underline">
                <UnderlineTab active={active}>{d.label}</UnderlineTab>
              </Link>
            );
          })}
        </nav>
        {inStage && (
        <nav aria-label="Sections" className="flex gap-2 border-b border-border">
          {inGarments
            ? garmentSections.map((s) =>
                s.to ? (
                  <Link key={s.label} to={s.to} className="no-underline">
                    <UnderlineTab active={pathname === s.to}>{s.label}</UnderlineTab>
                  </Link>
                ) : (
                  <UnderlineTab key={s.label} active={false} disabled>
                    {s.label}
                    <Soon />
                  </UnderlineTab>
                ),
              )
            : costingSections.map((s) => (
                <UnderlineTab key={s.label} active={s.available} disabled={!s.available}>
                  {s.label}
                  {!s.available && <Soon />}
                </UnderlineTab>
              ))}
        </nav>
        )}
        {!inGarments && inStage && (
        <nav aria-label="Steps" className="flex flex-wrap gap-1 pt-4">
          {steps.map((s) =>
            s.to ? (
              <Link
                key={s.label}
                to={s.to}
                aria-current={pathname === s.to ? "page" : undefined}
                style={pathname === s.to ? { backgroundColor: `color-mix(in srgb, ${stage} 16%, transparent)`, color: stage } : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm no-underline",
                  pathname === s.to ? "font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {s.label}
              </Link>
            ) : (
              <span key={s.label} aria-disabled="true" className="rounded-md px-3 py-1.5 text-sm text-muted-foreground opacity-70">
                {s.label}
                <Soon />
              </span>
            ),
          )}
        </nav>
        )}
      </div>

      <div className="h-1" style={{ backgroundColor: stage }} aria-hidden="true" />
      <main id="main-content" tabIndex={-1} className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6 focus:outline-none">
        <Outlet />
      </main>
    </div>
  );
}
