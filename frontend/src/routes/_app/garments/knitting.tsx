import { createFileRoute } from "@tanstack/react-router";
import { KnittingPage } from "@/features/garments/KnittingPage";

export const Route = createFileRoute("/_app/garments/knitting")({
  component: KnittingPage,
});
