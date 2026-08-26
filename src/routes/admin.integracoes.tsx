import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrmIntegrationPanel } from "@/components/admin/CrmIntegrationPanel";
import { WebhooksPanel } from "@/components/admin/WebhooksPanel";
import { SsoHealthPanel } from "@/components/admin/SsoHealthPanel";
import { ProvisionQueuePanel } from "@/components/admin/ProvisionQueuePanel";
import { EmailQueuePanel } from "@/components/admin/EmailQueuePanel";
import { CronMonitorPanel } from "@/components/admin/CronMonitorPanel";
import { ModuleGuard } from "@/components/admin/admin-context";

export const Route = createFileRoute("/admin/integracoes")({
  component: IntegracoesPage,
});

function IntegracoesPage() {
  return (
    <ModuleGuard module="integracoes">
      <Tabs defaultValue="sso">
        <TabsList className="flex-wrap">
          <TabsTrigger value="sso">Saúde do SSO</TabsTrigger>
          <TabsTrigger value="provisionamento">Provisionamento</TabsTrigger>
          <TabsTrigger value="emails">E-mails</TabsTrigger>
          <TabsTrigger value="rotinas">Rotinas automáticas</TabsTrigger>
          <TabsTrigger value="crm">FLEXUS | CRM</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks de pagamento</TabsTrigger>
        </TabsList>
        <TabsContent value="sso" className="mt-6">
          <SsoHealthPanel />
        </TabsContent>
        <TabsContent value="provisionamento" className="mt-6">
          <ProvisionQueuePanel />
        </TabsContent>
        <TabsContent value="emails" className="mt-6">
          <EmailQueuePanel />
        </TabsContent>
        <TabsContent value="rotinas" className="mt-6">
          <CronMonitorPanel />
        </TabsContent>
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

