import { createFileRoute } from "@tanstack/react-router";
import { FinancePanel } from "@/components/admin/FinancePanel";
import { ModuleGuard } from "@/components/admin/admin-context";

export const Route = createFileRoute("/admin/financeiro")({
  component: () => (
    <ModuleGuard module="financeiro">
      <FinancePanel />
    </ModuleGuard>
  ),
});
