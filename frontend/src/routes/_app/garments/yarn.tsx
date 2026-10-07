import { createFileRoute } from "@tanstack/react-router";
import { YarnPage } from "@/features/garments/YarnPage";

export const Route = createFileRoute("/_app/garments/yarn")({
  component: YarnPage,
});
