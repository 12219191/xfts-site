import { createFileRoute } from "@tanstack/react-router";
import { DunningPanel } from "@/components/admin/DunningPanel";
import { ModuleGuard } from "@/components/admin/admin-context";

export const Route = createFileRoute("/admin/cobranca")({
  component: () => (
    <ModuleGuard module="cobranca">
      <DunningPanel />
    </ModuleGuard>
  ),
});
