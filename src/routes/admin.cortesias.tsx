import { createFileRoute } from "@tanstack/react-router";
import { CourtesyPanel } from "@/components/admin/CourtesyPanel";
import { ModuleGuard } from "@/components/admin/admin-context";

export const Route = createFileRoute("/admin/cortesias")({
  component: () => (
    <ModuleGuard module="cortesias">
      <CourtesyPanel />
    </ModuleGuard>
  ),
});
