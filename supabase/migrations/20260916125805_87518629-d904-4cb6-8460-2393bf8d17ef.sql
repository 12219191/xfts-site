
-- Capability maps para barbearia, clinica, estetica e crm
WITH raw(product_key, key, name, description, category, req, scope, sort_order) AS (
  VALUES
  -- BARBEARIA
  ('barbearia','agenda.view','Agenda','Visualizar e gerenciar a agenda de atendimentos','agenda',NULL,'TENANT',10),
  ('barbearia','appointments.manage','Gestão de atendimentos','Criar, editar e cancelar atendimentos','agenda',NULL,'TENANT',20),
  ('barbearia','sales.manage','Vendas e comandas','Registrar vendas, comandas e pagamentos','vendas',NULL,'TENANT',30),
  ('barbearia','reports.basic','Relatórios básicos','Faturamento e atendimentos do período','relatorios',NULL,'TENANT',40),
  ('barbearia','reports.retention_analysis','Análise de retenção','Retenção e recorrência de clientes','relatorios','relatorios_avancados','TENANT',50),
  ('barbearia','reports.professional_ranking','Ranking de profissionais','Desempenho por barbeiro','relatorios','relatorios_avancados','TENANT',60),
  ('barbearia','reports.export','Exportar relatórios','Exportar dados em CSV/Excel','relatorios','exportacao_dados','TENANT_ADMIN',70),
  ('barbearia','integrations.api','Integrações e API','Acesso à API e integrações externas','integracoes','integracoes_api','TENANT_ADMIN',80),
  ('barbearia','automations.whatsapp','Automações de WhatsApp','Lembretes e mensagens automáticas','automacoes','automacoes','TENANT_ADMIN',90),
  ('barbearia','branding.custom','Marca própria','Personalizar logo e cores do sistema','configuracoes','marca_propria','TENANT_ADMIN',100),
  -- CLINICA
  ('clinica','agenda.view','Agenda','Visualizar e gerenciar a agenda de consultas','agenda',NULL,'TENANT',10),
  ('clinica','appointments.manage','Gestão de consultas','Criar, editar e cancelar consultas','agenda',NULL,'TENANT',20),
  ('clinica','patients.manage','Cadastro de pacientes','Gerenciar pacientes e histórico','pacientes',NULL,'TENANT',30),
  ('clinica','reports.basic','Relatórios básicos','Faturamento e consultas do período','relatorios',NULL,'TENANT',40),
  ('clinica','reports.retention_analysis','Análise de retenção','Retenção e recorrência de pacientes','relatorios','relatorios_avancados','TENANT',50),
  ('clinica','reports.professional_ranking','Ranking de profissionais','Desempenho por profissional','relatorios','relatorios_avancados','TENANT',60),
  ('clinica','reports.export','Exportar relatórios','Exportar dados em CSV/Excel','relatorios','exportacao_dados','TENANT_ADMIN',70),
  ('clinica','integrations.api','Integrações e API','Acesso à API e integrações externas','integracoes','integracoes_api','TENANT_ADMIN',80),
  ('clinica','automations.reminders','Automações de lembretes','Confirmação e lembrete de consultas','automacoes','automacoes','TENANT_ADMIN',90),
  ('clinica','branding.custom','Marca própria','Personalizar logo e cores do sistema','configuracoes','marca_propria','TENANT_ADMIN',100),
  -- ESTETICA
  ('estetica','agenda.view','Agenda','Visualizar e gerenciar a agenda de sessões','agenda',NULL,'TENANT',10),
  ('estetica','appointments.manage','Gestão de sessões','Criar, editar e cancelar sessões','agenda',NULL,'TENANT',20),
  ('estetica','packages.manage','Pacotes e protocolos','Gerenciar pacotes de tratamento','pacotes',NULL,'TENANT',30),
  ('estetica','reports.basic','Relatórios básicos','Faturamento e sessões do período','relatorios',NULL,'TENANT',40),
  ('estetica','reports.retention_analysis','Análise de retenção','Retenção e recorrência de clientes','relatorios','relatorios_avancados','TENANT',50),
  ('estetica','reports.professional_ranking','Ranking de profissionais','Desempenho por profissional','relatorios','relatorios_avancados','TENANT',60),
  ('estetica','reports.export','Exportar relatórios','Exportar dados em CSV/Excel','relatorios','exportacao_dados','TENANT_ADMIN',70),
  ('estetica','integrations.api','Integrações e API','Acesso à API e integrações externas','integracoes','integracoes_api','TENANT_ADMIN',80),
  ('estetica','automations.reminders','Automações de lembretes','Lembretes e pós-atendimento automáticos','automacoes','automacoes','TENANT_ADMIN',90),
  ('estetica','branding.custom','Marca própria','Personalizar logo e cores do sistema','configuracoes','marca_propria','TENANT_ADMIN',100),
  -- CRM
  ('crm','leads.manage','Gestão de leads','Cadastrar e acompanhar leads','leads',NULL,'TENANT',10),
  ('crm','pipeline.manage','Pipeline de negociações','Mover oportunidades entre etapas','pipeline',NULL,'TENANT',20),
  ('crm','activities.manage','Atividades e follow-up','Tarefas, ligações e anotações','atividades',NULL,'TENANT',30),
  ('crm','reports.basic','Relatórios básicos','Leads e negociações do período','relatorios',NULL,'TENANT',40),
  ('crm','reports.sales_funnel','Funil de vendas','Conversão por etapa do funil','relatorios','relatorios_avancados','TENANT',50),
  ('crm','reports.revenue_forecast','Previsão de receita','Projeção de receita do pipeline','relatorios','relatorios_avancados','TENANT',60),
  ('crm','reports.export','Exportar relatórios','Exportar dados em CSV/Excel','relatorios','exportacao_dados','TENANT_ADMIN',70),
  ('crm','integrations.api','Integrações e API','Acesso à API, webhooks e integrações','integracoes','integracoes_api','TENANT_ADMIN',80),
  ('crm','automations.cadence','Automações de cadência','Sequências automáticas de contato','automacoes','automacoes','TENANT_ADMIN',90),
  ('crm','branding.custom','Marca própria','Personalizar logo e cores do sistema','configuracoes','marca_propria','TENANT_ADMIN',100)
)
INSERT INTO public.product_capabilities
  (product_key, key, name, description, category, required_entitlement_key, visibility_scope, enabled, sort_order)
SELECT r.product_key, r.key, r.name, r.description, r.category, r.req, r.scope, true, r.sort_order
FROM raw r
JOIN public.catalog_products p ON p.key = r.product_key
ON CONFLICT (product_key, key) DO NOTHING;

-- Recursos protegidos por capability
INSERT INTO public.capability_resources (capability_id, resource_type, resource_key)
SELECT c.id,
       CASE
         WHEN c.key LIKE 'reports.export%' THEN 'EXPORT'
         WHEN c.key LIKE 'reports.%' THEN 'REPORT'
         WHEN c.key LIKE 'automations.%' THEN 'AUTOMATION'
         WHEN c.key LIKE 'integrations.%' THEN 'API_ENDPOINT'
         ELSE 'UI_ROUTE'
       END,
       c.key
FROM public.product_capabilities c
WHERE c.product_key IN ('barbearia','clinica','estetica','crm')
ON CONFLICT (capability_id, resource_type, resource_key) DO NOTHING;
