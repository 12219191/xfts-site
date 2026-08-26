import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrmIntegrationPanel } from "@/components/admin/CrmIntegrationPanel";
import { WebhooksPanel } from "@/components/admin/WebhooksPanel";
import { ModuleGuard } from "@/components/admin/admin-context";

export const Route = createFileRoute("/admin/integracoes")({
  component: IntegracoesPage,
});

function IntegracoesPage() {
  return (
    <ModuleGuard module="integracoes">
      <Tabs defaultValue="crm">
        <TabsList>
          <TabsTrigger value="crm">FLEXUS | CRM</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks de pagamento</TabsTrigger>
        </TabsList>
        <TabsContent value="crm" className="mt-6">
          <CrmIntegrationPanel />
        </TabsContent>
        <TabsContent value="webhooks" className="mt-6">
          <WebhooksPanel />
        </TabsContent>
      </Tabs>
    </ModuleGuard>
  );
}
