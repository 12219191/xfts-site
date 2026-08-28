ALTER TABLE public.catalog_products
  ADD COLUMN IF NOT EXISTS available_for_purchase boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS available_in_hub boolean NOT NULL DEFAULT false;

UPDATE public.catalog_products
   SET available_for_purchase = (status IN ('active','beta')),
       available_in_hub = (status <> 'development');