import { createFileRoute } from "@tanstack/react-router";
import { ProcessingPage } from "@/features/costing/ProcessingPage";

export const Route = createFileRoute("/_app/costing/processing")({
  component: ProcessingPage,
});
