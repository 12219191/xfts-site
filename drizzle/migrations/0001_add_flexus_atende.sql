INSERT INTO public.catalog_products (key, name, url, landing, price_prefix, available, sort_order, status, show_on_website, available_for_purchase, available_in_hub, display_name, short_description, icon, cta_label, cta_href)
VALUES ('atende','FLEXUS | Atende','https://xfts-flexus10.com','/produtos/flexus-atende','flexus_atende',true,7,'active',true,false,true,'FLEXUS | Atende',
'Atendimento pelo WhatsApp (API oficial) com agentes de IA configuráveis, base de conhecimento própria e caixa de entrada para a equipe.',
'MessageCircle','Fale com a gente','/contato')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.product_capabilities (product_key, key, name, description, category, required_entitlement_key, visibility_scope, enabled, sort_order) VALUES
('atende','dashboard.view','Painel inicial','Visão geral do atendimento','geral',NULL,'TENANT',true,1),
('atende','inbox.manage','Caixa de entrada','Conversas e atendimento humano','atendimento',NULL,'TENANT',true,2),
('atende','contacts.manage','Contatos','Cadastro e histórico de contatos','cadastros',NULL,'TENANT',true,3),
('atende','agents.manage','Agentes de IA','Criar e configurar agentes de IA','ia',NULL,'TENANT_ADMIN',true,4),
('atende','knowledge.manage','Base de conhecimento','Conteúdo próprio usado pelos agentes','ia',NULL,'TENANT_ADMIN',true,5),
('atende','channels.manage','Canais','Conexão com a API oficial do WhatsApp','integracoes',NULL,'TENANT_ADMIN',true,6),
('atende','team.manage','Equipe','Membros e papéis da equipe','configuracoes',NULL,'TENANT_ADMIN',true,7),
('atende','metrics.view','Métricas','Métricas de atendimento e acompanhamento de uso','relatorios',NULL,'TENANT_ADMIN',true,8),
('atende','billing.view','Plano','Plano contratado e uso','configuracoes',NULL,'TENANT_ADMIN',true,9),
('atende','settings.manage','Configurações','Configurações da conta','configuracoes',NULL,'TENANT_ADMIN',true,10)
ON CONFLICT (product_key, key) DO NOTHING;

INSERT INTO public.capability_resources (capability_id, resource_type, resource_key)
SELECT c.id, 'UI_ROUTE', v.route
FROM (VALUES
 ('dashboard.view','/app'),
 ('inbox.manage','/app/caixa-de-entrada'),
 ('contacts.manage','/app/contatos'),
 ('agents.manage','/app/agentes'),
 ('agents.manage','/app/agentes/$agentId'),
 ('knowledge.manage','/app/conhecimento'),
 ('channels.manage','/app/canais'),
 ('team.manage','/app/equipe'),
 ('metrics.view','/app/metricas'),
 ('billing.view','/app/plano'),
 ('settings.manage','/app/configuracoes')
) AS v(cap, route)
JOIN public.product_capabilities c ON c.product_key = 'atende' AND c.key = v.cap
ON CONFLICT (capability_id, resource_type, resource_key) DO NOTHING;