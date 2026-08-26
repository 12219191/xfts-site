import { createFileRoute } from "@tanstack/react-router";
import { BlogPanel } from "@/components/admin/BlogPanel";
import { ModuleGuard } from "@/components/admin/admin-context";

export const Route = createFileRoute("/admin/conteudo")({
  component: () => (
    <ModuleGuard module="conteudo">
      <BlogPanel />
    </ModuleGuard>
  ),
});
