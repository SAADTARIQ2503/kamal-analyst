import { createFileRoute } from "@tanstack/react-router";
import { PoLifecyclePage } from "@/features/po/PoLifecyclePage";

export const Route = createFileRoute("/_app/po")({
  component: PoLifecyclePage,
});
