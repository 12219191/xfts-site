DO $$ BEGIN
  CREATE TYPE public.product_status AS ENUM ('active','development','beta','paused','discontinued');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.catalog_products
  ADD COLUMN IF NOT EXISTS status public.product_status NOT NULL DEFAULT 'development',
  ADD COLUMN IF NOT EXISTS show_on_website boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS beta_note text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS short_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS subheadline text,
  ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT 'Sparkles',
  ADD COLUMN IF NOT EXISTS cta_label text NOT NULL DEFAULT 'Saiba Mais',
  ADD COLUMN IF NOT EXISTS cta_href text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS image_alt text;

UPDATE public.catalog_products SET status = CASE WHEN available THEN 'active'::public.product_status ELSE 'development'::public.product_status END;

UPDATE public.catalog_products SET
  short_description = v.desc,
  icon = v.icon,
  image_alt = COALESCE(image_alt, v.alt)
FROM (VALUES
  ('clinica','Sistema completo para consultórios e clínicas. Agendamentos, prontuários eletrônicos e controle financeiro.','Stethoscope','FLEXUS | Clínica — software de gestão para clínicas em uso na recepção'),
  ('barbearia','Controle de estoque, vendas, PDV e CRM para barbearias e salões masculinos.','Scissors','FLEXUS | Barbearia — sistema de gestão para barbearias em uso no salão'),
  ('estetica','Estoque, vendas e CRM para clínicas de estética e salões de beleza.','Sparkles','FLEXUS | Estética — software de gestão para clínicas de estética'),
  ('aba','Sistema para clínicas de Análise do Comportamento Aplicada (ABA / TEA): coleta de dados, evolução e relatórios.','Brain','FLEXUS | ABA — plataforma de gestão para clínicas de terapia ABA'),
  ('crm','CRM de vendas multi-segmento com pipeline kanban, automações e relatórios de conversão.','TrendingUp','FLEXUS | CRM — painel de CRM com funil de vendas e oportunidades'),
  ('casa360','ERP doméstico: estoque da despensa, lista de compras automática e finanças da casa em um só painel.','House','FLEXUS | Casa360° — sistema de gestão para casas de repouso e cuidado 360°')
) AS v(key, "desc", icon, alt)
WHERE catalog_products.key = v.key;

UPDATE public.catalog_products p
   SET image_url = i.image_url,
       image_alt = COALESCE(i.alt_text, p.image_alt)
  FROM public.product_images i
 WHERE i.slug = p.key;

UPDATE public.catalog_products SET cta_href = landing WHERE cta_href IS NULL;

DROP POLICY IF EXISTS "Catalogo de produtos e publico" ON public.catalog_products;
CREATE POLICY "Catalogo de produtos e publico"
  ON public.catalog_products FOR SELECT
  TO anon, authenticated
  USING (show_on_website = true);