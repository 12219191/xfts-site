CREATE TABLE public.product_capabilities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_key text NOT NULL REFERENCES public.catalog_products(key) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'geral',
  required_entitlement_key text,
  visibility_scope text NOT NULL DEFAULT 'TENANT',
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 10,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_capabilities_key_unique UNIQUE (product_key, key),
  CONSTRAINT product_capabilities_scope_check CHECK (visibility_scope IN ('TENANT','TENANT_ADMIN','XFTS_SUPPORT','XFTS_SUPERADMIN','SYSTEM'))
);

GRANT SELECT ON public.product_capabilities TO authenticated;
GRANT ALL ON public.product_capabilities TO service_role;
ALTER TABLE public.product_capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contas conectadas leem capabilities" ON public.product_capabilities FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_product_capabilities_updated_at BEFORE UPDATE ON public.product_capabilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.capability_resources (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  capability_id uuid NOT NULL REFERENCES public.product_capabilities(id) ON DELETE CASCADE,
  resource_type text NOT NULL,
  resource_key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT capability_resources_unique UNIQUE (capability_id, resource_type, resource_key),
  CONSTRAINT capability_resources_type_check CHECK (resource_type IN ('UI_ROUTE','API_ENDPOINT','ACTION','REPORT','EXPORT','AUTOMATION','AI_FEATURE'))
);

GRANT SELECT ON public.capability_resources TO authenticated;
GRANT ALL ON public.capability_resources TO service_role;
ALTER TABLE public.capability_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contas conectadas leem resources" ON public.capability_resources FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_product_capabilities_product ON public.product_capabilities(product_key);
CREATE INDEX idx_capability_resources_capability ON public.capability_resources(capability_id);