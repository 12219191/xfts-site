import { createFileRoute } from "@tanstack/react-router";
import { AdminSubscriptionsPanel } from "@/components/AdminSubscriptionsPanel";
import { ModuleGuard } from "@/components/admin/admin-context";

export const Route = createFileRoute("/admin/assinaturas")({
  component: () => (
    <ModuleGuard module="assinaturas">
      <AdminSubscriptionsPanel />
    </ModuleGuard>
  ),
});
