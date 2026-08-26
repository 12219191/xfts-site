import { createFileRoute } from "@tanstack/react-router";
import { FormSubmissionsPanel } from "@/components/admin/FormSubmissionsPanel";
import { ModuleGuard } from "@/components/admin/admin-context";

export const Route = createFileRoute("/admin/leads")({
  component: () => (
    <ModuleGuard module="leads">
      <FormSubmissionsPanel />
    </ModuleGuard>
  ),
});
