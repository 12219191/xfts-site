import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PRODUCT_IMAGE_DEFAULTS,
  PRODUCT_IMAGE_ALT_DEFAULTS,
  PRODUCT_IMAGE_LABELS,
  type ProductSlug,
} from "@/lib/product-images";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

export function ProductImagesPanel() {
  const [overrides, setOverrides] = useState<Partial<Record<ProductSlug, string>>>({});
  const [drafts, setDrafts] = useState<Partial<Record<ProductSlug, string>>>({});
  const [altOverrides, setAltOverrides] = useState<Partial<Record<ProductSlug, string>>>({});
  const [altDrafts, setAltDrafts] = useState<Partial<Record<ProductSlug, string>>>({});
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState<ProductSlug | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("product_images")
      .select("slug, image_url, alt_text");
    if (error) {
      toast.error("Não foi possível carregar as imagens", { description: error.message });
    }
    const map: Partial<Record<ProductSlug, string>> = {};
    const alts: Partial<Record<ProductSlug, string>> = {};
    for (const row of (data ?? []) as { slug: string; image_url: string | null; alt_text?: string | null }[]) {
      const slug = row.slug as ProductSlug;
      if (row.image_url) map[slug] = row.image_url;
      if (row.alt_text) alts[slug] = row.alt_text;
    }
    setOverrides(map);
    setDrafts(map);
    setAltOverrides(alts);
    setAltDrafts(alts);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (slug: ProductSlug) => {
    const url = drafts[slug];
    if (!url) return;
    const alt = (altDrafts[slug] ?? "").trim() || PRODUCT_IMAGE_ALT_DEFAULTS[slug];
    setSavingSlug(slug);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("product_images")
      .upsert(
        {
          slug,
          image_url: url,
          alt_text: alt,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        },
        { onConflict: "slug" },
      );
    setSavingSlug(null);
    if (error) {
      toast.error("Falha ao salvar", { description: error.message });
      return;
    }
    setOverrides((prev) => ({ ...prev, [slug]: url }));
    setAltOverrides((prev) => ({ ...prev, [slug]: alt }));
    setAltDrafts((prev) => ({ ...prev, [slug]: alt }));
    toast.success("Imagem do produto atualizada");
  };

  const reset = async (slug: ProductSlug) => {
    setSavingSlug(slug);
    const { error } = await supabase.from("product_images").delete().eq("slug", slug);
    setSavingSlug(null);
    if (error) {
      toast.error("Falha ao restaurar", { description: error.message });
      return;
    }
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[slug];
      return next;
    });
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[slug];
      return next;
    });
    setAltOverrides((prev) => {
      const next = { ...prev };
      delete next[slug];
      return next;
    });
    setAltDrafts((prev) => {
      const next = { ...prev };
      delete next[slug];
      return next;
    });
    toast.success("Imagem padrão restaurada");
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
        Envie uma nova foto para cada produto. As imagens são comprimidas e
        convertidas para WebP automaticamente no envio, e o texto alternativo (alt)
        é preenchido sozinho para SEO e acessibilidade.
      </p>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {PRODUCT_IMAGE_LABELS.map(({ slug, label }) => {
          const current = drafts[slug] ?? overrides[slug] ?? PRODUCT_IMAGE_DEFAULTS[slug];
          const isCustom = !!overrides[slug];
          const currentAlt =
            altDrafts[slug] ?? altOverrides[slug] ?? PRODUCT_IMAGE_ALT_DEFAULTS[slug];
          const dirty =
            !!drafts[slug] &&
            ((drafts[slug] ?? "") !== (overrides[slug] ?? "") ||
              (altDrafts[slug] ?? "") !== (altOverrides[slug] ?? ""));

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
                  value={current}
                  previewAlt={currentAlt}
                  onChange={(url) => setDrafts((prev) => ({ ...prev, [slug]: url }))}
                  onAltSuggestion={(suggested) =>
                    setAltDrafts((prev) => ({
                      ...prev,
                      [slug]:
                        prev[slug]?.trim() ||
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
                    disabled={!dirty || savingSlug === slug}
                    onClick={() => void save(slug)}
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
                      onClick={() => void reset(slug)}
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
