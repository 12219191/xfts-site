CREATE TABLE public.catalog_products (
  key text PRIMARY KEY,
  name text NOT NULL,
  url text NOT NULL DEFAULT '',
  landing text NOT NULL DEFAULT '',
  price_prefix text NOT NULL,
  available boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.catalog_products TO anon;
GRANT SELECT ON public.catalog_products TO authenticated;
GRANT ALL ON public.catalog_products TO service_role;

ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catalogo de produtos e publico"
  ON public.catalog_products FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TRIGGER update_catalog_products_updated_at
  BEFORE UPDATE ON public.catalog_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.catalog_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_key text NOT NULL REFERENCES public.catalog_products(key) ON DELETE CASCADE,
  name text NOT NULL,
  tier text NOT NULL DEFAULT 'basico',
  description text NOT NULL DEFAULT '',
  price_month_cents integer NOT NULL DEFAULT 0,
  price_year_cents integer,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  seats integer,
  cta_label text NOT NULL DEFAULT 'Começar Agora',
  price_lookup_key text,
  annual_lookup_key text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_key, name)
);

CREATE INDEX catalog_plans_product_idx ON public.catalog_plans (product_key, sort_order);

GRANT SELECT ON public.catalog_plans TO anon;
GRANT SELECT ON public.catalog_plans TO authenticated;
GRANT ALL ON public.catalog_plans TO service_role;

ALTER TABLE public.catalog_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Planos ativos sao publicos"
  ON public.catalog_plans FOR SELECT
  TO anon, authenticated
  USING (active = true);

CREATE TRIGGER update_catalog_plans_updated_at
  BEFORE UPDATE ON public.catalog_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.catalog_products (key, name, url, landing, price_prefix, available, sort_order) VALUES
  ('barbearia', 'FLEXUS | Barbearia', 'https://xfts-flexus6.com', '/produtos/gestao-barbearias', 'gestao_barbearias', true, 1),
  ('crm', 'FLEXUS | CRM', 'https://xfts-flexus7.com', '/produtos/flexus-crm', 'flexus_crm', true, 2),
  ('casa360', 'FLEXUS | Casa360°', 'https://xfts-flexus8.com', '/produtos/flexus-casa360', 'flexus_casa360', true, 3),
  ('clinica', 'FLEXUS | Clínica', '', '/produtos/gestao-clinica', 'gestao_clinica', false, 4),
  ('estetica', 'FLEXUS | Estética', '', '/produtos/gestao-esteticas', 'gestao_esteticas', false, 5),
  ('aba', 'FLEXUS | ABA', '', '/produtos/flexus-aba', 'flexus_aba', false, 6);

INSERT INTO public.catalog_plans (product_key, name, tier, description, price_month_cents, price_year_cents, features, seats, cta_label, price_lookup_key, annual_lookup_key, sort_order) VALUES
  ('clinica', 'Básico', 'basico', 'Ideal para consultórios individuais', 9900, 95000, '["Agendamento online","Prontuário eletrônico","Controle financeiro","Emissão de recibos","1 profissional"]'::jsonb, 1, 'Começar Agora', 'gestao_clinica_basico_mensal', 'gestao_clinica_basico_anual', 1),
  ('clinica', 'Pro', 'pro', 'Para clínicas com múltiplos profissionais', 19900, 191000, '["Tudo do Básico","Notificações automáticas","Relatórios avançados","Gestão de equipe","Até 10 profissionais"]'::jsonb, 10, 'Começar Agora', 'gestao_clinica_pro_mensal', 'gestao_clinica_pro_anual', 2),
  ('clinica', 'Enterprise', 'enterprise', 'Para redes e grandes operações', 39900, NULL, '["Tudo do Pro","Multi-unidades","Integração com convênios","API e integrações","Profissionais ilimitados"]'::jsonb, NULL, 'Falar com Consultor', NULL, NULL, 3),

  ('barbearia', 'Básico', 'basico', 'Para barbearias individuais', 9900, 95000, '["PDV integrado","Controle de estoque","Agendamento online","CRM de clientes","1 profissional"]'::jsonb, 1, 'Começar Agora', 'gestao_barbearias_basico_mensal', 'gestao_barbearias_basico_anual', 1),
  ('barbearia', 'Pro', 'pro', 'Para redes e múltiplas unidades', 19900, 191000, '["Tudo do Básico","Gestão de comissões","Notificações WhatsApp","Fidelização de clientes","Até 10 profissionais"]'::jsonb, 10, 'Começar Agora', 'gestao_barbearias_pro_mensal', 'gestao_barbearias_pro_anual', 2),
  ('barbearia', 'Enterprise', 'enterprise', 'Para redes e grandes operações', 34900, NULL, '["Tudo do Pro","Multi-unidades","Relatórios completos","Suporte dedicado 24/7","Profissionais ilimitados"]'::jsonb, NULL, 'Falar com Consultor', NULL, NULL, 3),

  ('estetica', 'Básico', 'basico', 'Para studios individuais', 9900, 95000, '["Gestão de vendas e PDV","Controle de estoque","Agendamento online","CRM de clientes","1 profissional"]'::jsonb, 1, 'Começar Agora', 'gestao_esteticas_basico_mensal', 'gestao_esteticas_basico_anual', 1),
  ('estetica', 'Pro', 'pro', 'Para clínicas com equipe', 19900, 191000, '["Tudo do Básico","Controle de pacotes e sessões","Gestão de comissões","Notificações automáticas","Até 10 profissionais"]'::jsonb, 10, 'Começar Agora', 'gestao_esteticas_pro_mensal', 'gestao_esteticas_pro_anual', 2),
  ('estetica', 'Enterprise', 'enterprise', 'Para redes e grandes operações', 37900, NULL, '["Tudo do Pro","Multi-unidades","API e integrações","Suporte dedicado 24/7","Profissionais ilimitados"]'::jsonb, NULL, 'Falar com Consultor', NULL, NULL, 3),

  ('aba', 'Básico', 'basico', 'Ideal para terapeutas autônomos', 9900, 95000, '["Registro de tentativas","Agenda de sessões","Prontuário básico","Relatórios mensais","1 profissional"]'::jsonb, 1, 'Começar Agora', 'flexus_aba_basico_mensal', 'flexus_aba_basico_anual', 1),
  ('aba', 'Pro', 'pro', 'Para clínicas em crescimento', 19900, 191000, '["Tudo do Básico","Gráficos de evolução","PTI completo","Controle de horas autorizadas","Até 10 profissionais"]'::jsonb, 10, 'Começar Agora', 'flexus_aba_pro_mensal', 'flexus_aba_pro_anual', 2),
  ('aba', 'Enterprise', 'enterprise', 'Para redes e grandes clínicas', 39900, NULL, '["Tudo do Pro","Multi-unidades","Integração com convênios","API e integrações","Profissionais ilimitados"]'::jsonb, NULL, 'Falar com Consultor', NULL, NULL, 3),

  ('crm', 'Básico', 'basico', 'Para times pequenos começando', 9900, 95000, '["Pipeline kanban","Gestão de leads","Importação de contatos","Relatórios básicos","Até 3 usuários"]'::jsonb, 3, 'Começar Agora', 'flexus_crm_basico_mensal', 'flexus_crm_basico_anual', 1),
  ('crm', 'Pro', 'pro', 'Para equipes em escala', 19900, 191000, '["Tudo do Básico","Automações de follow-up","WhatsApp integrado","Funil customizável","Até 15 usuários"]'::jsonb, 15, 'Começar Agora', 'flexus_crm_pro_mensal', 'flexus_crm_pro_anual', 2),
  ('crm', 'Enterprise', 'enterprise', 'Para grandes operações comerciais', 39900, NULL, '["Tudo do Pro","Múltiplas equipes","Relatórios avançados","API e integrações","Usuários ilimitados"]'::jsonb, NULL, 'Falar com Consultor', NULL, NULL, 3),

  ('casa360', 'Básico', 'basico', 'Para quem mora sozinho', 9900, 95000, '["Estoque da casa","Lista de compras automática","Controle de validade","Finanças básicas do mês","1 morador"]'::jsonb, 1, 'Começar Agora', 'flexus_casa360_basico_mensal', 'flexus_casa360_basico_anual', 1),
  ('casa360', 'Pro', 'pro', 'Para casais e famílias', 19900, 191000, '["Tudo do Básico","Até 6 moradores","Contas recorrentes e lembretes","Histórico de preços","Relatórios avançados"]'::jsonb, 6, 'Começar Agora', 'flexus_casa360_pro_mensal', 'flexus_casa360_pro_anual', 2),
  ('casa360', 'Enterprise', 'enterprise', 'Para famílias grandes e múltiplas residências', 39900, NULL, '["Tudo do Pro","Múltiplas residências","Moradores ilimitados","API e integrações","Suporte dedicado"]'::jsonb, NULL, 'Falar com Consultor', NULL, NULL, 3);