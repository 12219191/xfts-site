import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { supabase } from "@/integrations/supabase/client";
import {
  PRODUCT_IMAGE_DEFAULTS,
  PRODUCT_IMAGE_LABELS,
  type ProductSlug,
} from "@/lib/product-images";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

export function ProductImagesPanel() {
  const [overrides, setOverrides] = useState<Partial<Record<ProductSlug, string>>>({});
  const [drafts, setDrafts] = useState<Partial<Record<ProductSlug, string>>>({});
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState<ProductSlug | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("product_images")
      .select("slug, image_url");
    if (error) {
      toast.error("Não foi possível carregar as imagens", { description: error.message });
    }
    const map: Partial<Record<ProductSlug, string>> = {};
    for (const row of data ?? []) {
      if (row.image_url) map[row.slug as ProductSlug] = row.image_url;
    }
    setOverrides(map);
    setDrafts(map);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (slug: ProductSlug) => {
    const url = drafts[slug];
    if (!url) return;
    setSavingSlug(slug);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("product_images")
      .upsert(
        { slug, image_url: url, updated_at: new Date().toISOString(), updated_by: user?.id ?? null },
        { onConflict: "slug" },
      );
    setSavingSlug(null);
    if (error) {
      toast.error("Falha ao salvar", { description: error.message });
      return;
    }
    setOverrides((prev) => ({ ...prev, [slug]: url }));
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
        Envie uma nova foto para cada produto. A troca aparece na home, na listagem
        de produtos e na página do produto — sem alterar o código.
      </p>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {PRODUCT_IMAGE_LABELS.map(({ slug, label }) => {
          const current = drafts[slug] ?? overrides[slug] ?? PRODUCT_IMAGE_DEFAULTS[slug];
          const isCustom = !!overrides[slug];
          const dirty = (drafts[slug] ?? "") !== (overrides[slug] ?? "") && !!drafts[slug];

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
                  onChange={(url) => setDrafts((prev) => ({ ...prev, [slug]: url }))}
                />

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
