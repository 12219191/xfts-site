import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import heroClinicAsset from "@/assets/hero-clinic.webp.asset.json";
import heroBarbershopAsset from "@/assets/hero-barbershop.webp.asset.json";
import heroAestheticsAsset from "@/assets/hero-aesthetics.webp.asset.json";
import heroAbaAsset from "@/assets/hero-aba.webp.asset.json";
import heroCrmAsset from "@/assets/hero-crm.webp.asset.json";
import heroCasa360Asset from "@/assets/hero-casa360.webp.asset.json";

export type ProductSlug =
  | "clinica"
  | "barbearia"
  | "estetica"
  | "aba"
  | "crm"
  | "casa360";

export const PRODUCT_IMAGE_DEFAULTS: Record<ProductSlug, string> = {
  clinica: heroClinicAsset.url,
  barbearia: heroBarbershopAsset.url,
  estetica: heroAestheticsAsset.url,
  aba: heroAbaAsset.url,
  crm: heroCrmAsset.url,
  casa360: heroCasa360Asset.url,
};

export const PRODUCT_IMAGE_LABELS: { slug: ProductSlug; label: string }[] = [
  { slug: "clinica", label: "FLEXUS | Clínica" },
  { slug: "barbearia", label: "FLEXUS | Barbearia" },
  { slug: "estetica", label: "FLEXUS | Estética" },
  { slug: "aba", label: "FLEXUS | ABA" },
  { slug: "crm", label: "FLEXUS | CRM" },
  { slug: "casa360", label: "FLEXUS | Casa360°" },
];

export async function fetchProductImageOverrides(): Promise<
  Partial<Record<ProductSlug, string>>
> {
  const { data, error } = await supabase
    .from("product_images")
    .select("slug, image_url");

  if (error || !data) return {};

  const map: Partial<Record<ProductSlug, string>> = {};
  for (const row of data) {
    if (row.image_url) map[row.slug as ProductSlug] = row.image_url;
  }
  return map;
}

/**
 * Retorna as imagens dos produtos: começa nos assets do código (SSR-safe)
 * e substitui pelas imagens enviadas no admin assim que carregam.
 */
export function useProductImages(): Record<ProductSlug, string> {
  const [images, setImages] = useState<Record<ProductSlug, string>>(
    PRODUCT_IMAGE_DEFAULTS,
  );

  useEffect(() => {
    let active = true;
    void fetchProductImageOverrides().then((overrides) => {
      if (active && Object.keys(overrides).length > 0) {
        setImages({ ...PRODUCT_IMAGE_DEFAULTS, ...overrides });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return images;
}

export function useProductImage(slug: ProductSlug): string {
  return useProductImages()[slug];
}
