import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getAdminCatalog,
  saveCatalogProduct,
  type CatalogProductInput,
} from "@/lib/admin-catalog.functions";
import type { CatalogProduct } from "@/lib/catalog";
import {
  PRODUCT_IMAGE_DEFAULTS,
  PRODUCT_IMAGE_ALT_DEFAULTS,
  PRODUCT_IMAGE_LABELS,
  type ProductSlug,
} from "@/lib/product-images";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

function toInput(p: CatalogProduct, imageUrl: string, imageAlt: string): CatalogProductInput {
  return {
    key: p.key,
    name: p.name,
    url: p.url,
    landing: p.landing,
    pricePrefix: p.pricePrefix,
    sortOrder: p.sortOrder,
    status: p.status,
    showOnWebsite: p.showOnWebsite,
    availableForPurchase: p.availableForPurchase,
    availableInHub: p.availableInHub,
    betaNote: p.betaNote ?? "",
    displayName: p.displayName ?? "",
    shortDescription: p.shortDescription ?? "",
    headline: p.headline ?? "",
    subheadline: p.subheadline ?? "",
    icon: p.icon ?? "",
    ctaLabel: p.ctaLabel ?? "",
    ctaHref: p.ctaHref ?? "",
    imageUrl,
    imageAlt,
  };
}

export function ProductImagesPanel() {
  const [products, setProducts] = useState<Record<string, CatalogProduct>>({});
  const [drafts, setDrafts] = useState<Partial<Record<ProductSlug, string>>>({});
  const [altDrafts, setAltDrafts] = useState<Partial<Record<ProductSlug, string>>>({});
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState<ProductSlug | null>(null);

  const load = async () => {
    try {
      const catalog = await getAdminCatalog();
      const map: Record<string, CatalogProduct> = {};
      for (const p of catalog.products) map[p.key] = p;
      setProducts(map);
      setDrafts({});
      setAltDrafts({});
    } catch (e) {
      toast.error("Não foi possível carregar as imagens", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const persist = async (slug: ProductSlug, url: string, alt: string, successMsg: string) => {
    const product = products[slug];
    if (!product) {
      toast.error("Produto não encontrado no catálogo");
      return;
    }
    setSavingSlug(slug);
    try {
      await saveCatalogProduct({ data: toInput(product, url, alt) });
      setProducts((prev) => ({
        ...prev,
        [slug]: { ...product, imageUrl: url || PRODUCT_IMAGE_DEFAULTS[slug], imageAlt: alt },
      }));
      setDrafts((prev) => ({ ...prev, [slug]: undefined }));
      setAltDrafts((prev) => ({ ...prev, [slug]: undefined }));
      toast.success(successMsg);
    } catch (e) {
      toast.error("Falha ao salvar", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
    setSavingSlug(null);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando imagens...
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground">Imagens dos produtos</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Envie uma nova foto para cada produto. A foto salva aqui é a mesma usada na
        página inicial, na página Nossos Produtos e na página do produto. As imagens
        são comprimidas e convertidas para WebP automaticamente no envio.
      </p>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {PRODUCT_IMAGE_LABELS.map(({ slug, label }) => {
          const product = products[slug];
          const savedUrl = product?.imageUrl?.trim() ?? "";
          const savedAlt = product?.imageAlt?.trim() ?? "";
          const current = drafts[slug] ?? savedUrl ?? PRODUCT_IMAGE_DEFAULTS[slug];
          const isCustom = !!savedUrl && savedUrl !== PRODUCT_IMAGE_DEFAULTS[slug];
          const currentAlt = altDrafts[slug] ?? savedAlt ?? PRODUCT_IMAGE_ALT_DEFAULTS[slug];
          const dirty =
            (drafts[slug] !== undefined && drafts[slug] !== savedUrl) ||
            (altDrafts[slug] !== undefined && altDrafts[slug] !== savedAlt);

          return (
            <Card key={slug} className="border-border bg-card">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${isCustom ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {isCustom ? "Personalizada" : "Padrão"}
                  </span>
                </div>

                <ImageUploader
                  value={current || PRODUCT_IMAGE_DEFAULTS[slug]}
                  previewAlt={currentAlt}
                  onChange={(url) => setDrafts((prev) => ({ ...prev, [slug]: url }))}
                  onAltSuggestion={(suggested) =>
                    setAltDrafts((prev) => ({
                      ...prev,
                      [slug]:
                        prev[slug]?.trim() ||
                        savedAlt ||
                        (suggested ? `${label} — ${suggested}` : PRODUCT_IMAGE_ALT_DEFAULTS[slug]),
                    }))
                  }
                />

                <div className="space-y-1.5">
                  <Label htmlFor={`alt-${slug}`} className="text-xs text-muted-foreground">
                    Texto alternativo (alt) — SEO e acessibilidade
                  </Label>
                  <Input
                    id={`alt-${slug}`}
                    value={currentAlt}
                    maxLength={125}
                    placeholder={PRODUCT_IMAGE_ALT_DEFAULTS[slug]}
                    onChange={(e) =>
                      setAltDrafts((prev) => ({ ...prev, [slug]: e.target.value }))
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {currentAlt.length}/125 — preenchido automaticamente, ajuste se quiser.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-primary text-primary-foreground"
                    disabled={!product || !dirty || savingSlug === slug}
                    onClick={() =>
                      void persist(
                        slug,
                        (drafts[slug] ?? savedUrl) || "",
                        (currentAlt || "").trim() || PRODUCT_IMAGE_ALT_DEFAULTS[slug],
                        "Imagem do produto atualizada",
                      )
                    }
                  >
                    {savingSlug === slug ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Salvar
                  </Button>
                  {isCustom && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={savingSlug === slug}
                      onClick={() =>
                        void persist(
                          slug,
                          PRODUCT_IMAGE_DEFAULTS[slug],
                          PRODUCT_IMAGE_ALT_DEFAULTS[slug],
                          "Imagem padrão restaurada",
                        )
                      }
                    >
                      <RotateCcw className="mr-2 h-4 w-4" /> Padrão
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
