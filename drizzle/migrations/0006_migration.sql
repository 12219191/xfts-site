INSERT INTO public.catalog_products (key, name, display_name, url, landing, price_prefix, available, available_for_purchase, available_in_hub, show_on_website, status, icon, cta_label, cta_href, short_description, headline, subheadline, sort_order)
VALUES ('flow','FLEXUS | Flow','FLEXUS | Flow','','/produtos/flexus-flow','flexus_flow',false,false,false,true,'development','Workflow','Saiba Mais','/produtos/flexus-flow',
'Automação de conversas no WhatsApp, Instagram e Facebook com fluxos visuais, caixa de entrada da equipe e captura de leads.',
'FLEXUS | Flow','Automatize conversas no WhatsApp, Instagram e Facebook com fluxos visuais e envie os leads direto ao CRM.',8)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.entitlement_definitions (product_key, key, label, kind, unit, description, sort_order) VALUES
('flow','usuarios','Usuários da equipe','limit','usuários','Quantidade máxima de usuários (nulo = ilimitado)',1),
('flow','contacts_active','Contatos ativos','limit','contatos','Contatos com ao menos uma interação no ciclo de cobrança (nulo = ilimitado)',2),
('flow','channels','Canais conectados','limit','canais','WhatsApp, Instagram e Facebook conectados (nulo = ilimitado)',3),
('flow','flows_active','Fluxos ativos','limit','fluxos','Fluxos publicados ao mesmo tempo (nulo = ilimitado)',4),
('flow','campaigns','Campanhas','feature','','Disparo ativo de campanhas',5),
('flow','ai_agents','Agentes de IA','feature','','Agentes de IA dentro dos fluxos',6),
('flow','export_csv','Exportação CSV','feature','','Exportar contatos e conversas em CSV',7),
('flow','public_api','API pública','feature','','Acesso à API pública',8),
('flow','outbound_webhooks','Webhooks de saída','feature','','Envio de eventos para sistemas externos',9);

INSERT INTO public.catalog_plans (product_key, name, tier, description, price_month_cents, price_year_cents, seats, price_lookup_key, annual_lookup_key, active, sort_order, trial_days, cta_label, features, entitlements) VALUES
('flow','Start','start','Para começar a automatizar',8900,85400,3,'flexus_flow_start_mensal','flexus_flow_start_anual',true,1,7,'Começar Agora',
 '["Até 500 contatos ativos","1 canal","5 fluxos ativos","Caixa de entrada da equipe","Modelos prontos","Até 3 usuários"]',
 '{"usuarios":3,"contacts_active":500,"channels":1,"flows_active":5,"campaigns":false,"ai_agents":false,"export_csv":false,"public_api":false,"outbound_webhooks":false}'),
('flow','Pro','pro','Mais Popular: campanhas e agentes de IA',24900,239000,10,'flexus_flow_pro_mensal','flexus_flow_pro_anual',true,2,7,'Começar Agora',
 '["Tudo do Start","Até 2.500 contatos ativos","3 canais","Fluxos ilimitados","Campanhas","Agentes de IA","Exportação CSV","Até 10 usuários"]',
 '{"usuarios":10,"contacts_active":2500,"channels":3,"flows_active":null,"campaigns":true,"ai_agents":true,"export_csv":true,"public_api":false,"outbound_webhooks":false}'),
('flow','Business','business','Para operações com integrações',54900,527000,25,'flexus_flow_business_mensal','flexus_flow_business_anual',true,3,7,'Começar Agora',
 '["Tudo do Pro","Até 10.000 contatos ativos","Canais ilimitados","API pública","Webhooks de saída","Até 25 usuários"]',
 '{"usuarios":25,"contacts_active":10000,"channels":null,"flows_active":null,"campaigns":true,"ai_agents":true,"export_csv":true,"public_api":true,"outbound_webhooks":true}'),
('flow','Enterprise','enterprise','Sob medida, atribuído pela Cortesia',0,NULL,100,'flexus_flow_enterprise_mensal',NULL,false,4,0,'Falar com Consultor',
 '["Tudo do Business","Até 50.000 contatos ativos","Canais e fluxos ilimitados","Até 100 usuários"]',
 '{"usuarios":100,"contacts_active":50000,"channels":null,"flows_active":null,"campaigns":true,"ai_agents":true,"export_csv":true,"public_api":true,"outbound_webhooks":true}');