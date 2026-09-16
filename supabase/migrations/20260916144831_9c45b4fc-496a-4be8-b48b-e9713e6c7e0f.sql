DELETE FROM public.product_capabilities WHERE product_key = 'casa360';

INSERT INTO public.product_capabilities (product_key, key, name, description, category, required_entitlement_key, visibility_scope, enabled, sort_order) VALUES
('casa360','dashboard.view','Painel inicial','Painel inicial da casa','geral',NULL,'TENANT',true,1),
('casa360','inventory.manage','Estoque','Lista, ficha, validade, preços, balança, unificação e nutrição','operacao',NULL,'TENANT',true,2),
('casa360','shopping.manage','Lista de compras','Lista de compras da casa','operacao',NULL,'TENANT',true,3),
('casa360','recipes.manage','Receitas','Cadastro e uso de receitas','operacao',NULL,'TENANT',true,4),
('casa360','meals.planner','Planejador de refeições','Planejamento semanal de refeições','operacao',NULL,'TENANT',true,5),
('casa360','finance.basic','Finanças','Lançamentos e visão financeira básica','financeiro',NULL,'TENANT',true,6),
('casa360','reports.financial_analysis','Painel financeiro','Análises financeiras avançadas','relatorios','relatorios_avancados','TENANT',true,7),
('casa360','finance.cards','Cartões e faturas','Cartões de crédito e faturas','financeiro',NULL,'TENANT',true,8),
('casa360','finance.budgets','Orçamentos','Orçamentos por categoria','financeiro',NULL,'TENANT',true,9),
('casa360','finance.recurring','Recorrências','Lançamentos recorrentes','financeiro',NULL,'TENANT',true,10),
('casa360','finance.assets','Patrimônio','Controle de patrimônio','financeiro',NULL,'TENANT',true,11),
('casa360','finance.settlements','Acertos entre membros','Divisão e acerto de despesas','financeiro',NULL,'TENANT',true,12),
('casa360','imports.manage','Importações','Importar NFC-e, OFX e CSV','integracoes','integracoes_api','TENANT',true,13),
('casa360','agenda.view','Agenda','Agenda da casa','operacao',NULL,'TENANT',true,14),
('casa360','health.module','Saúde','Corpo, jejum, nutrição, metas, pratos, histórico e importações','saude',NULL,'TENANT',true,15),
('casa360','pets.module','Pets','Lista e ficha dos pets','pets',NULL,'TENANT',true,16),
('casa360','family.members','Família e membros','Membros da casa','cadastros',NULL,'TENANT',true,17),
('casa360','settings.manage','Configurações','Configurações gerais do sistema','configuracoes',NULL,'TENANT_ADMIN',true,18);

INSERT INTO public.capability_resources (capability_id, resource_type, resource_key)
SELECT c.id, 'UI_ROUTE', v.route
FROM (VALUES
 ('dashboard.view','/dashboard'),
 ('inventory.manage','/estoque'),
 ('shopping.manage','/compras'),
 ('recipes.manage','/receitas'),
 ('meals.planner','/refeicoes'),
 ('finance.basic','/financas'),
 ('reports.financial_analysis','/painel-financeiro'),
 ('finance.cards','/cartoes'),
 ('finance.budgets','/orcamentos'),
 ('finance.recurring','/recorrencias'),
 ('finance.assets','/patrimonio'),
 ('finance.settlements','/acertos'),
 ('imports.manage','/importar'),
 ('agenda.view','/agenda'),
 ('health.module','/saude'),
 ('pets.module','/pets'),
 ('family.members','/membros'),
 ('settings.manage','/configuracoes')
) AS v(key, route)
JOIN public.product_capabilities c ON c.product_key = 'casa360' AND c.key = v.key
ON CONFLICT (capability_id, resource_type, resource_key) DO NOTHING;

INSERT INTO public.capability_resources (capability_id, resource_type, resource_key)
SELECT c.id, 'REPORT', 'financeiro.analises'
FROM public.product_capabilities c
WHERE c.product_key = 'casa360' AND c.key = 'reports.financial_analysis'
ON CONFLICT (capability_id, resource_type, resource_key) DO NOTHING;