-- =====================================================================
-- HUB (xfts-site / Control Center) | Produto: estetica
-- Entitlements, valores por plano e capabilities do FLEXUS | Estética
--
-- Destino: supabase/migrations/ do repositório xfts-site (ou SQL editor).
-- Idempotente e ADITIVO: nunca sobrescreve o que já existe no catálogo.
--   * definições      -> ON CONFLICT DO NOTHING
--   * plan entitlements -> valores novos entram; chaves já presentes PREVALECEM
--   * capabilities    -> ON CONFLICT DO NOTHING
--
-- IMPORTANTE (rollout seguro): as capabilities nascem SEM entitlement exigido
-- (required_entitlement_key = NULL). Ou seja, rodar este arquivo NÃO muda o
-- acesso de nenhum cliente. O gate só passa a valer quando a seção D (ondas)
-- for executada, uma onda por vez, depois da análise de impacto (seção E).
--
-- Modelo (como o HUB já funciona):
--   entitlement  = o que o PLANO inclui (snake_case; feature ou limit)
--   capability   = funcionalidade real do SaaS (chave com ponto), que pode exigir
--                  UM entitlement; várias capabilities podem exigir o mesmo.
--   limit: null = ilimitado | inteiro >= 0 = teto | chave ausente = negado
--
-- Fora do catálogo de propósito (valem em TODOS os planos, não são paywall):
--   Gate Clínico, evoluções imutáveis, TCLE, RLS, RBAC presets, backup diário.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- A) Definições de entitlement (somente produto 'estetica')
--    Já existem para todos os produtos: usuarios, relatorios_avancados,
--    exportacao_dados, integracoes_api, automacoes, marca_propria,
--    suporte_prioritario  -> reaproveitados, não recriados.
--    'metered' do rascunho anterior não existe no HUB: vira 'limit'.
-- ---------------------------------------------------------------------
insert into public.entitlement_definitions
  (product_key, key, label, kind, unit, description, sort_order)
select 'estetica', d.key, d.label, d.kind, d.unit, d.description, d.sort_order
from (values
  -- limites
  ('profissionais',            'Profissionais na agenda',        'limit',   'profissionais', 'Profissionais ativos habilitados para agenda e comissão. Separado de "usuarios" (logins da equipe).', 20),
  ('armazenamento_clinico_gb', 'Armazenamento clínico',          'limit',   'GB',            'Fotos clínicas e anexos de exames em GB.', 22),
  ('parcelas_max',             'Parcelas máximas no fechamento', 'limit',   'parcelas',      'Máximo de parcelas ao fechar atendimento ou plano.', 23),
  ('numeros_whatsapp',         'Números WhatsApp conectados',    'limit',   'números',       'WABA do próprio tenant: números conectados ao inbox.', 24),
  ('atendentes_inbox',         'Atendentes no inbox',            'limit',   'atendentes',    'Atendentes simultâneos no inbox WhatsApp.', 25),
  ('requisicoes_api_mes',      'Requisições de API por mês',     'limit',   'req/mês',       'Franquia mensal do FLEXUS Scheduling v1. Informativo: o HUB não mede uso.', 26),
  -- recursos
  ('salas_equipamentos',       'Salas e equipamentos',           'feature', '', 'Alocação e trava de conflito de salas e aparelhos.', 30),
  ('lista_espera',             'Lista de espera inteligente',    'feature', '', 'Motor de proteção de agenda e ofertas a pacientes na fila.', 31),
  ('whatsapp_inbox',           'Inbox WhatsApp',                 'feature', '', 'Conversas multiatendente e ofertas da lista de espera via WhatsApp.', 32),
  ('whatsapp_automacoes',      'Automações do inbox',            'feature', '', 'Respostas automáticas e fora do horário.', 33),
  ('prontuario_avancado',      'Prontuário avançado',            'feature', '', 'Exportação auditável (SHA-256) e verificação pública por QR Code.', 34),
  ('protocolos_planos',        'Protocolos e planos de tratamento', 'feature', '', 'Modelos de protocolo, venda de plano e agendamento guiado.', 35),
  ('creditos_paciente',        'Créditos e sinais do paciente',  'feature', '', 'Carteira do paciente, adiantamentos e estornos.', 36),
  ('pdv_avancado',             'PDV avançado',                   'feature', '', 'Divisão de pagamento, simulação de taxas e venda sugestiva.', 37),
  ('comissoes_avancadas',      'Comissões por regra',            'feature', '', 'Regras por profissional e serviço, anti-duplicidade.', 38),
  ('financeiro_gerencial',     'Financeiro gerencial',           'feature', '', 'DRE, Curva ABC, centros de custo, caixa x competência, conciliação OFX.', 39),
  ('dados_360',                'Dados gerenciais 360',           'feature', '', 'Ocupação, LTV, ticket médio, canais e retenção.', 40),
  ('estoque_avancado',         'Estoque avançado',               'feature', '', 'Fichas técnicas com baixa automática, CMV e inventário.', 41),
  ('crm_fidelizacao',          'CRM e fidelização',              'feature', '', 'Segmentação RFM, cashback/pontos e clubes de assinatura.', 42),
  ('portal_paciente',          'Portal do paciente',             'feature', '', 'Autoatendimento do paciente (agendar, remarcar, aceitar termos).', 43),
  ('rbac_customizado',         'Perfis de acesso customizados',  'feature', '', 'Criação de perfis além dos 6 presets.', 44),
  ('backup_externo',           'Backup externo S3',              'feature', '', 'Réplica externa com manifesto criptográfico.', 45),
  ('auditoria_exportavel',     'Exportação do log de auditoria', 'feature', '', 'Exportar trilha de auditoria.', 46)
) as d(key, label, kind, unit, description, sort_order)
where exists (select 1 from public.catalog_products p where p.key = 'estetica')
on conflict (product_key, key) do nothing;

-- ---------------------------------------------------------------------
-- B) Valores por plano (catalog_plans.entitlements), por tier
--    Novos = esquerda do ||; EXISTENTES = direita (prevalecem).
--    Textos são convertidos para jsonb: 'null' = ilimitado, 'false' = não incluído.
--
--    Decisões comerciais: 'profissionais' segue o site (Básico 1, Pro 10, Enterprise
--    ilimitado). 'usuarios' é SEPARADO de profissionais e definido explicitamente
--    na seção B2 (5 / 20 / ilimitado). Multiunidade e SSO não existem no produto:
--    não entram no catálogo. Comissão simples fica em todos os planos (sem gate).
-- ---------------------------------------------------------------------
with seed(key, basico, pro, enterprise) as (values
  ('profissionais',            '1',     '10',    'null'),
  ('armazenamento_clinico_gb', '5',     '50',    '500'),
  ('parcelas_max',             '3',     '12',    '12'),
  ('numeros_whatsapp',         '0',     '1',     'null'),
  ('atendentes_inbox',         '0',     '5',     'null'),
  ('requisicoes_api_mes',      '0',     '0',     '1000000'),
  ('salas_equipamentos',       'false', 'true',  'true'),
  ('lista_espera',             'false', 'true',  'true'),
  ('whatsapp_inbox',           'false', 'true',  'true'),
  ('whatsapp_automacoes',      'false', 'false', 'true'),
  ('prontuario_avancado',      'false', 'true',  'true'),
  ('protocolos_planos',        'false', 'true',  'true'),
  ('creditos_paciente',        'false', 'true',  'true'),
  ('pdv_avancado',             'false', 'true',  'true'),
  ('comissoes_avancadas',      'false', 'true',  'true'),
  ('financeiro_gerencial',     'false', 'true',  'true'),
  ('dados_360',                'false', 'false', 'true'),
  ('estoque_avancado',         'false', 'true',  'true'),
  ('crm_fidelizacao',          'false', 'true',  'true'),
  ('portal_paciente',          'false', 'true',  'true'),
  ('rbac_customizado',         'false', 'false', 'true'),
  ('backup_externo',           'false', 'false', 'true'),
  ('auditoria_exportavel',     'false', 'false', 'true')
),
per_plan as (
  select p.id,
         jsonb_object_agg(
           s.key,
           (case p.tier when 'basico' then s.basico
                        when 'pro'    then s.pro
                        else               s.enterprise end)::jsonb
         ) as novos
  from public.catalog_plans p
  cross join seed s
  where p.product_key = 'estetica'
  group by p.id
)
update public.catalog_plans p
   set entitlements = pp.novos || p.entitlements,
       updated_at   = now()
  from per_plan pp
 where pp.id = p.id;

-- ---------------------------------------------------------------------
-- B2) 'usuarios' (logins da equipe) separado de 'profissionais'.
--     Hoje vale seats (1/10/null) = nº de profissionais. Esta é a ÚNICA
--     sobrescrita de valor existente do arquivo, e é intencional.
--     O resolver do HUB já dá precedência a entitlements.usuarios explícito
--     sobre catalog_plans.seats (limit-modes.md, P1-02C). 'seats' não muda.
-- ---------------------------------------------------------------------
update public.catalog_plans p
   set entitlements = p.entitlements || jsonb_build_object(
         'usuarios',
         case p.tier when 'basico' then to_jsonb(5)
                     when 'pro'    then to_jsonb(20)
                     else 'null'::jsonb end),
       updated_at = now()
 where p.product_key = 'estetica';

-- ---------------------------------------------------------------------
-- C) Capabilities (sem entitlement exigido = nenhuma mudança de acesso agora)
--    scope: TENANT (qualquer usuário do painel) | TENANT_ADMIN (só administrador)
-- ---------------------------------------------------------------------
with raw(key, name, description, category, scope, sort_order) as (values
  ('agenda.rooms_equipment',     'Salas e equipamentos',               'Alocação e trava de conflito de salas e aparelhos',          'agenda',       'TENANT',       110),
  ('agenda.waitlist_engine',     'Lista de espera inteligente',        'Proteção de agenda e ofertas a pacientes na fila',           'agenda',       'TENANT',       120),
  ('inbox.whatsapp',             'Conversas (WhatsApp)',               'Inbox multiatendente com o WABA da clínica',                 'whatsapp',     'TENANT',       130),
  ('waitlist.whatsapp_offers',   'Ofertas da lista de espera (WhatsApp)', 'Disparo automático de ofertas pela lista de espera',      'whatsapp',     'TENANT',       140),
  ('inbox.automations',          'Automações do inbox',                'Respostas automáticas e fora do horário',                    'whatsapp',     'TENANT_ADMIN', 150),
  ('api.scheduling_v1',          'FLEXUS Scheduling v1',               'API e webhooks HMAC para robôs e canais externos',           'integracoes',  'TENANT_ADMIN', 160),
  ('clinical.chart_export_hash', 'Exportação auditável de prontuário', 'PDF do prontuário com hash SHA-256 e trilha',                'clinico',      'TENANT',       170),
  ('clinical.public_verification','Verificação pública de documentos', 'Página pública com QR Code para atestados e declarações',   'clinico',      'TENANT',       180),
  ('protocols.templates',        'Modelos de protocolos',              'Protocolos padronizados com etapas e intervalos',            'protocolos',   'TENANT',       190),
  ('protocols.patient_plans',    'Planos de tratamento',               'Venda, rateio e agendamento guiado do plano do paciente',    'protocolos',   'TENANT',       200),
  ('pos.patient_credits',        'Créditos e sinais do paciente',      'Carteira, adiantamentos, abatimento e estornos',             'pdv',          'TENANT',       210),
  ('pos.payment_split',          'Divisão de pagamento',               'Múltiplas formas de pagamento no fechamento',                'pdv',          'TENANT',       220),
  ('pos.fee_simulation',         'Simulação de taxas',                 'Simulação de taxas de maquininha e parcelamento',            'pdv',          'TENANT',       230),
  ('pos.smart_upsell',           'Venda sugestiva',                    'Upsell e cross-sell no checkout',                            'pdv',          'TENANT',       240),
  ('finance.commissions_rules',  'Comissões por regra',                'Regras por profissional e serviço, anti-duplicidade',        'financeiro',   'TENANT_ADMIN', 250),
  ('finance.accrual_vs_cash',    'Regime caixa x competência',         'Separação de receitas e despesas por regime',                'financeiro',   'TENANT_ADMIN', 260),
  ('finance.cost_centers',       'Centros de custo',                   'Classificação de despesas por centro de custo',              'financeiro',   'TENANT_ADMIN', 270),
  ('finance.ofx_reconciliation', 'Conciliação bancária (OFX)',         'Conciliação via arquivo OFX',                                'financeiro',   'TENANT_ADMIN', 280),
  ('reports.dre',                'DRE',                                'Demonstrativo do Resultado do Exercício',                    'relatorios',   'TENANT_ADMIN', 290),
  ('reports.abc_curve',          'Curva ABC',                          'Curva ABC de procedimentos e produtos',                      'relatorios',   'TENANT_ADMIN', 300),
  ('analytics.dados_360',        'Dados gerenciais 360',               'Ocupação, LTV, ticket médio, canais e retenção',             'relatorios',   'TENANT_ADMIN', 310),
  ('inventory.tech_sheets',      'Fichas técnicas',                    'Insumos por procedimento com baixa automática',              'estoque',      'TENANT',       320),
  ('inventory.cmv',              'CMV por atendimento',                'Custo das mercadorias vendidas por atendimento',             'estoque',      'TENANT',       330),
  ('inventory.audit_sessions',   'Sessões de inventário',              'Auditoria física com ajuste de perdas',                      'estoque',      'TENANT',       340),
  ('crm.rfm_segmentation',       'Segmentação RFM',                    'Novos, fiéis, VIPs, em risco e inativos',                    'crm',          'TENANT',       350),
  ('crm.cashback_points',        'Cashback e pontos',                  'Programa de fidelidade por procedimento concluído',          'crm',          'TENANT',       360),
  ('crm.subscription_clubs',     'Clubes de assinatura',               'Planos mensais com cotas recorrentes',                       'crm',          'TENANT',       370),
  ('portal.patient',             'Portal do paciente',                 'Autoatendimento mobile-first do paciente',                   'portal',       'TENANT',       380),
  ('security.rbac_custom',       'Perfis customizados',                'Perfis de acesso além dos presets',                          'seguranca',    'TENANT_ADMIN', 390),
  ('backup.s3_external_manifest','Backup externo S3',                  'Réplica externa com manifesto criptográfico',                'seguranca',    'TENANT_ADMIN', 400),
  ('security.audit_log_export',  'Exportar log de auditoria',          'Exportação da trilha de auditoria',                          'seguranca',    'TENANT_ADMIN', 410)
)
insert into public.product_capabilities
  (product_key, key, name, description, category, required_entitlement_key, visibility_scope, enabled, sort_order)
select 'estetica', r.key, r.name, r.description, r.category, null, r.scope, true, r.sort_order
from raw r
where exists (select 1 from public.catalog_products p where p.key = 'estetica')
on conflict (product_key, key) do nothing;

-- Telas reais do painel (caminho SEM o prefixo /admin; o gate do Estética já normaliza).
-- Só telas inequívocas, e só se o caminho ainda não estiver mapeado no HUB
-- (o mapa devolvido é um objeto: dois mapeamentos do mesmo caminho se sobrescrevem).
-- Funcionalidades que são ABA/BOTÃO dentro de uma tela NÃO entram aqui: usam
-- <CapabilityGate capability="..."> no código e a trava no banco (ver relatório).
insert into public.capability_resources (capability_id, resource_type, resource_key)
select c.id, 'UI_ROUTE', v.path
from (values
  ('inbox.whatsapp',         '/conversas'),
  ('protocols.patient_plans','/relatorios/planos-tratamento'),
  ('pos.patient_credits',    '/relatorios/creditos'),
  ('analytics.dados_360',    '/relatorios/dados-360'),
  ('reports.dre',            '/dre')
) as v(cap_key, path)
join public.product_capabilities c
  on c.product_key = 'estetica' and c.key = v.cap_key
where not exists (
  select 1
    from public.capability_resources r2
    join public.product_capabilities c2 on c2.id = r2.capability_id
   where c2.product_key = 'estetica'
     and r2.resource_type = 'UI_ROUTE'
     and r2.resource_key = v.path
)
on conflict (capability_id, resource_type, resource_key) do nothing;

commit;

-- =====================================================================
-- D) ATIVAÇÃO POR ONDAS  (NÃO roda junto com a migration)
--    Cada onda só liga o gate (required_entitlement_key) das capabilities listadas.
--    Reverter = voltar required_entitlement_key para NULL (efeito em até 60 s,
--    sem deploy do SaaS).
--
--    Onda 1: Enterprise-only (baixo risco)   Onda 2: Pro, núcleo comercial
--    Onda 3: demais recursos Pro
--
--    Uso:  psql "$HUB_DB" -v wave=1 -f este_arquivo.sql   (rodar SÓ o bloco D)
-- =====================================================================
-- with plan(cap, ent, wave) as (values
--   ('inbox.automations',          'whatsapp_automacoes',  1),
--   ('api.scheduling_v1',          'integracoes_api',      1),
--   ('analytics.dados_360',        'dados_360',            1),
--   ('security.rbac_custom',       'rbac_customizado',     1),
--   ('backup.s3_external_manifest','backup_externo',       1),
--   ('security.audit_log_export',  'auditoria_exportavel', 1),
--   ('protocols.templates',        'protocolos_planos',    2),
--   ('protocols.patient_plans',    'protocolos_planos',    2),
--   ('pos.patient_credits',        'creditos_paciente',    2),
--   ('finance.commissions_rules',  'comissoes_avancadas',  2),
--   ('reports.dre',                'financeiro_gerencial', 2),
--   ('inbox.whatsapp',             'whatsapp_inbox',       2),
--   ('waitlist.whatsapp_offers',   'whatsapp_inbox',       2),
--   ('agenda.rooms_equipment',     'salas_equipamentos',   2),
--   ('agenda.waitlist_engine',     'lista_espera',         2),
--   ('pos.payment_split',          'pdv_avancado',         3),
--   ('pos.fee_simulation',         'pdv_avancado',         3),
--   ('pos.smart_upsell',           'pdv_avancado',         3),
--   ('finance.accrual_vs_cash',    'financeiro_gerencial', 3),
--   ('finance.cost_centers',       'financeiro_gerencial', 3),
--   ('finance.ofx_reconciliation', 'financeiro_gerencial', 3),
--   ('reports.abc_curve',          'financeiro_gerencial', 3),
--   ('inventory.tech_sheets',      'estoque_avancado',     3),
--   ('inventory.cmv',              'estoque_avancado',     3),
--   ('inventory.audit_sessions',   'estoque_avancado',     3),
--   ('crm.rfm_segmentation',       'crm_fidelizacao',      3),
--   ('crm.cashback_points',        'crm_fidelizacao',      3),
--   ('crm.subscription_clubs',     'crm_fidelizacao',      3),
--   ('portal.patient',             'portal_paciente',      3),
--   ('clinical.chart_export_hash', 'prontuario_avancado',  3),
--   ('clinical.public_verification','prontuario_avancado', 3)
-- )
-- update public.product_capabilities c
--    set required_entitlement_key = p.ent, updated_at = now()
--   from plan p
--  where c.product_key = 'estetica' and c.key = p.cap and p.wave = :wave;

-- =====================================================================
-- E) ANÁLISE DE IMPACTO (somente leitura) — rodar ANTES de cada onda
--    Quais assinaturas ativas de Estética perderiam qual recurso.
--    Aproximação: casa subscriptions.price_id com a lookup key mensal/anual do plano.
-- =====================================================================
-- select p.tier, count(distinct s.user_id) as clientes, e.key as recurso_que_perde
--   from public.subscriptions s
--   join public.catalog_plans p
--     on p.product_key = 'estetica'
--    and s.price_id in (p.price_lookup_key, p.annual_lookup_key)
--  cross join lateral jsonb_each(p.entitlements) e
--  where s.status in ('active','trialing','past_due')
--    and e.value = 'false'::jsonb
--  group by p.tier, e.key
--  order by p.tier, e.key;
