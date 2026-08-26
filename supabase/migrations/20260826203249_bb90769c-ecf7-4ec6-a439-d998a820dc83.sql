CREATE TABLE public.entitlement_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_key text NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  kind text NOT NULL DEFAULT 'feature' CHECK (kind IN ('feature','limit')),
  unit text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (product_key, key)
);

GRANT SELECT ON public.entitlement_definitions TO anon;
GRANT SELECT ON public.entitlement_definitions TO authenticated;
GRANT ALL ON public.entitlement_definitions TO service_role;

ALTER TABLE public.entitlement_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Definicoes de entitlements sao publicas"
  ON public.entitlement_definitions FOR SELECT TO anon, authenticated USING (true);

CREATE TRIGGER update_entitlement_definitions_updated_at
  BEFORE UPDATE ON public.entitlement_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.catalog_plans
  ADD COLUMN IF NOT EXISTS entitlements jsonb NOT NULL DEFAULT '{}'::jsonb;

INSERT INTO public.entitlement_definitions (product_key, key, label, kind, unit, description, sort_order)
SELECT p.key, d.key, d.label, d.kind, d.unit, d.description, d.sort_order
FROM public.catalog_products p
CROSS JOIN (VALUES
  ('usuarios', 'Usuários da equipe', 'limit', 'usuários', 'Quantidade máxima de usuários ativos no sistema', 1),
  ('relatorios_avancados', 'Relatórios avançados', 'feature', '', 'Painéis analíticos e relatórios detalhados', 2),
  ('exportacao_dados', 'Exportação de dados', 'feature', '', 'Exportar dados em CSV/Excel', 3),
  ('integracoes_api', 'Integrações e API', 'feature', '', 'Acesso à API e integrações externas', 4),
  ('automacoes', 'Automações', 'limit', 'automações', 'Quantidade de automações ativas', 5),
  ('marca_propria', 'Marca própria (white label)', 'feature', '', 'Personalizar logo e cores do sistema', 6),
  ('suporte_prioritario', 'Suporte prioritário', 'feature', '', 'Atendimento com prioridade e SLA reduzido', 7)
) AS d(key, label, kind, unit, description, sort_order)
ON CONFLICT (product_key, key) DO NOTHING;

UPDATE public.catalog_plans SET entitlements = jsonb_build_object(
  'usuarios', COALESCE(to_jsonb(seats), to_jsonb(CASE WHEN tier = 'basico' THEN 2 WHEN tier = 'pro' THEN 6 END), 'null'::jsonb),
  'relatorios_avancados', to_jsonb(tier IN ('pro','enterprise')),
  'exportacao_dados', to_jsonb(tier IN ('pro','enterprise')),
  'integracoes_api', to_jsonb(tier = 'enterprise'),
  'automacoes', CASE WHEN tier = 'basico' THEN to_jsonb(3) WHEN tier = 'pro' THEN to_jsonb(20) ELSE 'null'::jsonb END,
  'marca_propria', to_jsonb(tier = 'enterprise'),
  'suporte_prioritario', to_jsonb(tier IN ('pro','enterprise'))
)
WHERE entitlements = '{}'::jsonb;