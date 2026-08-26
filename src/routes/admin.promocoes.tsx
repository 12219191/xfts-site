import { createFileRoute } from "@tanstack/react-router";
import { PromotionsPanel } from "@/components/admin/PromotionsPanel";
import { ModuleGuard } from "@/components/admin/admin-context";

export const Route = createFileRoute("/admin/promocoes")({
  component: () => (
    <ModuleGuard module="promocoes">
      <PromotionsPanel />
    </ModuleGuard>
  ),
});
