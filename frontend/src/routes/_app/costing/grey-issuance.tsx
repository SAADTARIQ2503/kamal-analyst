import { createFileRoute } from "@tanstack/react-router";
import { GreyIssuancePage } from "@/features/costing/GreyIssuancePage";

export const Route = createFileRoute("/_app/costing/grey-issuance")({
  component: GreyIssuancePage,
});
