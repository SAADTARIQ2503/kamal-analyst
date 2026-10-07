import { createFileRoute } from "@tanstack/react-router";
import { CutToPackPage } from "@/features/costing/CutToPackPage";

export const Route = createFileRoute("/_app/costing/cut-to-pack")({
  component: CutToPackPage,
});
