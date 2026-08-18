import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ImageUploader } from "./ImageUploader";
import { Loader2 } from "lucide-react";

export interface ArticleForm {
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  image_url: string;
  author: string;
  published: boolean;
  publish_at: string | null;
  unpublish_at: string | null;
}

/** ISO (UTC) -> valor de input datetime-local no fuso do navegador */
export function isoToLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** valor de input datetime-local -> ISO (UTC) */
export function localInputToIso(value: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}


interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ArticleForm;
  setForm: (form: ArticleForm) => void;
  onSave: () => void;
  saving: boolean;
  isEditing: boolean;
  slugTaken: boolean;
}

export function ArticleEditorDialog({
  open,
  onOpenChange,
  form,
  setForm,
  onSave,
  saving,
  isEditing,
  slugTaken,
}: Props) {
  const canSave =
    form.title.trim().length > 0 && form.slug.trim().length > 0 && !slugTaken && !saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar artigo" : "Novo artigo"}</DialogTitle>
          <DialogDescription>
            Escreva o conteúdo e defina a capa e as opções de publicação.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Conteúdo */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="title">Título</Label>
                <span className="text-xs text-muted-foreground">
                  {form.title.length}/70
                </span>
              </div>
              <Input
                id="title"
                placeholder="Título do artigo"
                value={form.title}
                onChange={(e) =>
                  setForm({
                    ...form,
                    title: e.target.value,
                    slug: isEditing ? form.slug : generateSlug(e.target.value),
                  })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input
                id="slug"
                placeholder="titulo-do-artigo"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: generateSlug(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                /blog/{form.slug || "..."}
              </p>
              {slugTaken && (
                <p className="text-xs text-destructive">
                  Já existe outro artigo com este slug.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="summary">Resumo</Label>
                <span
                  className={`text-xs ${form.summary.length > 160 ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {form.summary.length}/160
                </span>
              </div>
              <Textarea
                id="summary"
                rows={2}
                placeholder="Resumo usado nos cards e no Google"
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="content">Conteúdo</Label>
              <Textarea
                id="content"
                rows={16}
                placeholder="Use ## para subtítulos e uma linha em branco entre parágrafos"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>
          </div>

          {/* Painel lateral */}
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Foto de capa</Label>
              <ImageUploader
                value={form.image_url}
                onChange={(url) => setForm({ ...form, image_url: url })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">Categoria</Label>
              <select
                id="category"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option>Gestão</option>
                <option>Tecnologia</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="author">Autor</Label>
              <Input
                id="author"
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Publicado</p>
                <p className="text-xs text-muted-foreground">
                  {form.published ? "Visível no site" : "Salvo como rascunho"}
                </p>
              </div>
              <Switch
                checked={form.published}
                onCheckedChange={(v) => setForm({ ...form, published: v })}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={onSave}
            disabled={!canSave}
            className="bg-cta text-cta-foreground hover:bg-cta/90"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function generateSlug(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
