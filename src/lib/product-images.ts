import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import heroClinicAsset from "@/assets/hero-clinic.webp.asset.json";
import heroBarbershopAsset from "@/assets/hero-barbershop.webp.asset.json";
import heroAestheticsAsset from "@/assets/hero-aesthetics.webp.asset.json";
import heroAbaAsset from "@/assets/hero-aba.webp.asset.json";
import heroCrmAsset from "@/assets/hero-crm.webp.asset.json";
import heroCasa360Asset from "@/assets/hero-casa360.webp.asset.json";
import heroAtende from "@/assets/hero-atende.jpg";
import heroFlow from "@/assets/hero-flow.jpg";

export type ProductSlug =
  | "clinica"
  | "barbearia"
  | "estetica"
  | "aba"
  | "crm"
  | "casa360"
  | "atende"
  | "flow";

export const PRODUCT_IMAGE_DEFAULTS: Record<ProductSlug, string> = {
  clinica: heroClinicAsset.url,
  barbearia: heroBarbershopAsset.url,
  estetica: heroAestheticsAsset.url,
  aba: heroAbaAsset.url,
  crm: heroCrmAsset.url,
  casa360: heroCasa360Asset.url,
  atende: heroAtende,
  flow: heroFlow,
};

export const PRODUCT_IMAGE_LABELS: { slug: ProductSlug; label: string }[] = [
  { slug: "clinica", label: "FLEXUS | Clínica" },
  { slug: "barbearia", label: "FLEXUS | Barbearia" },
  { slug: "estetica", label: "FLEXUS | Estética" },
  { slug: "aba", label: "FLEXUS | ABA" },
  { slug: "crm", label: "FLEXUS | CRM" },
  { slug: "casa360", label: "FLEXUS | Casa360°" },
  { slug: "atende", label: "FLEXUS | Atende" },
  { slug: "flow", label: "FLEXUS | Flow" },
];

export const PRODUCT_IMAGE_ALT_DEFAULTS: Record<ProductSlug, string> = {
  clinica: "FLEXUS | Clínica — software de gestão para clínicas em uso na recepção",
  barbearia: "FLEXUS | Barbearia — sistema de gestão para barbearias em uso no salão",
  estetica: "FLEXUS | Estética — software de gestão para clínicas de estética",
  aba: "FLEXUS | ABA — plataforma de gestão para clínicas de terapia ABA",
  crm: "FLEXUS | CRM — painel de CRM com funil de vendas e oportunidades",
  casa360: "FLEXUS | Casa360° — família na cozinha usando o painel de gestão da casa",
  atende: "FLEXUS | Atende — atendente usando a caixa de entrada com agente de IA",
  flow: "FLEXUS | Flow — empreendedor montando um fluxo visual de conversas no WhatsApp",
};

export interface ProductImage {
  url: string;
  alt: string;
}

/** Fonte única: a foto cadastrada no catálogo do produto. */
export async function fetchProductImageOverrides(): Promise<Partial<Record<ProductSlug, ProductImage>>> {
  const { data, error } = await supabase
    .from("catalog_products")
    .select("key, image_url, image_alt");

  if (error || !data) return {};

  const map: Partial<Record<ProductSlug, ProductImage>> = {};
  for (const row of data as { key: string; image_url: string | null; image_alt?: string | null }[]) {
    const slug = row.key as ProductSlug;
    if (!row.image_url?.trim()) continue;
    map[slug] = {
      url: row.image_url,
      alt: row.image_alt?.trim() || PRODUCT_IMAGE_ALT_DEFAULTS[slug] || "",
    };
  }
  return map;
}

const DEFAULT_PRODUCT_IMAGES = Object.fromEntries(
  (Object.keys(PRODUCT_IMAGE_DEFAULTS) as ProductSlug[]).map((slug) => [
    slug,
    { url: PRODUCT_IMAGE_DEFAULTS[slug], alt: PRODUCT_IMAGE_ALT_DEFAULTS[slug] },
  ]),
) as Record<ProductSlug, ProductImage>;

/**
 * Retorna as imagens dos produtos: começa nos assets do código (SSR-safe)
 * e substitui pelas imagens enviadas no admin assim que carregam.
 */
export function useProductImageData(): Record<ProductSlug, ProductImage> {
  const [images, setImages] = useState<Record<ProductSlug, ProductImage>>(
    DEFAULT_PRODUCT_IMAGES,
  );

  useEffect(() => {
    let active = true;
    void fetchProductImageOverrides().then((overrides) => {
      if (active && Object.keys(overrides).length > 0) {
        setImages({ ...DEFAULT_PRODUCT_IMAGES, ...overrides });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return images;
}

/** Apenas as URLs (compatível com o uso existente). */
export function useProductImages(): Record<ProductSlug, string> {
  const data = useProductImageData();
  return Object.fromEntries(
    (Object.keys(data) as ProductSlug[]).map((s) => [s, data[s].url]),
  ) as Record<ProductSlug, string>;
}

export function useProductImage(slug: ProductSlug): string {
  return useProductImageData()[slug].url;
}

export function useProductImageAlt(slug: ProductSlug): string {
  return useProductImageData()[slug].alt;
}
