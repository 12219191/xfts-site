import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, Edit, Trash2, Eye, EyeOff, FileText, Search, ImageOff,
  LayoutGrid, List, ExternalLink, ChevronLeft, ChevronRight,
  ArrowUp, ArrowDown, ChevronsUpDown, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArticleEditorDialog, generateSlug, type ArticleForm } from "./ArticleEditorDialog";

export interface Article extends ArticleForm {
  id: string;
  created_at: string;
}

const emptyForm: ArticleForm = {
  title: "",
  slug: "",
  summary: "",
  content: "",
  category: "Gestão",
  image_url: "",
  author: "Equipe XFTS",
  published: false,
};

const PAGE_SIZES = [10, 20, 50, 100];
type StatusFilter = "todos" | "publicados" | "rascunhos";
type SortKey = "created_at" | "title" | "category" | "published";
type SortDir = "asc" | "desc";

export function BlogPanel() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [category, setCategory] = useState("Todas");
  const [view, setView] = useState<"table" | "grid">("table");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");


  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);
  const [form, setForm] = useState<ArticleForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Article | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<"publish" | "unpublish" | "delete" | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);

  const fetchArticles = async () => {
    const { data, error } = await supabase
      .from("blog_articles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar artigos", { description: error.message });
    if (data) setArticles(data as Article[]);
    setLoading(false);
  };

  useEffect(() => {
    void fetchArticles();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, status, category, pageSize, sortKey, sortDir]);

  const categories = useMemo(
    () => ["Todas", ...Array.from(new Set(articles.map((a) => a.category))).sort()],
    [articles],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = articles.filter((a) => {
      const matchSearch =
        !q ||
        a.title.toLowerCase().includes(q) ||
        (a.summary ?? "").toLowerCase().includes(q);
      const matchStatus =
        status === "todos" ||
        (status === "publicados" ? a.published : !a.published);
      const matchCat = category === "Todas" || a.category === category;
      return matchSearch && matchStatus && matchCat;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "created_at") {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortKey === "published") {
        cmp = Number(a.published) - Number(b.published);
      } else {
        cmp = String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""), "pt-BR");
      }
      if (cmp === 0) {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return cmp * dir;
    });
  }, [articles, search, status, category, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "created_at" ? "desc" : "asc");
    }
  };


  const slugTaken = useMemo(
    () =>
      articles.some(
        (a) => a.slug === form.slug.trim() && a.id !== editing?.id && form.slug.trim() !== "",
      ),
    [articles, form.slug, editing],
  );

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const startEdit = (article: Article) => {
    setEditing(article);
    setForm({
      title: article.title,
      slug: article.slug,
      summary: article.summary ?? "",
      content: article.content ?? "",
      category: article.category,
      image_url: article.image_url ?? "",
      author: article.author,
      published: article.published,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, slug: generateSlug(form.slug) };
    const { error } = editing
      ? await supabase.from("blog_articles").update(payload).eq("id", editing.id)
      : await supabase.from("blog_articles").insert(payload);
    setSaving(false);

    if (error) {
      toast.error("Não foi possível salvar", { description: error.message });
      return;
    }
    toast.success(editing ? "Artigo atualizado" : "Artigo criado");
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    void fetchArticles();
  };

  const togglePublished = async (article: Article) => {
    const next = !article.published;
    setArticles((prev) =>
      prev.map((a) => (a.id === article.id ? { ...a, published: next } : a)),
    );
    const { error } = await supabase
      .from("blog_articles")
      .update({ published: next })
      .eq("id", article.id);
    if (error) {
      toast.error("Não foi possível alterar o status", { description: error.message });
      void fetchArticles();
      return;
    }
    toast.success(next ? "Artigo publicado" : "Artigo movido para rascunho");
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("blog_articles").delete().eq("id", toDelete.id);
    setToDelete(null);
    if (error) {
      toast.error("Não foi possível excluir", { description: error.message });
      return;
    }
    toast.success("Artigo excluído");
    void fetchArticles();
  };

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const visibleIds = pageItems.map((a) => a.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedSet.has(id));

  const toggleOne = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleAllVisible = () =>
    setSelected((prev) =>
      allVisibleSelected
        ? prev.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...prev, ...visibleIds])),
    );

  const selectAllFiltered = () => setSelected(filtered.map((a) => a.id));
  const clearSelection = () => setSelected([]);

  const runBulk = async () => {
    if (!bulkAction || selected.length === 0) return;
    setBulkRunning(true);
    const ids = [...selected];
    const { error } =
      bulkAction === "delete"
        ? await supabase.from("blog_articles").delete().in("id", ids)
        : await supabase
            .from("blog_articles")
            .update({ published: bulkAction === "publish" })
            .in("id", ids);
    setBulkRunning(false);
    setBulkAction(null);

    if (error) {
      toast.error("Não foi possível aplicar a ação em lote", { description: error.message });
      return;
    }
    toast.success(
      bulkAction === "delete"
        ? `${ids.length} artigo(s) excluído(s)`
        : bulkAction === "publish"
          ? `${ids.length} artigo(s) publicado(s)`
          : `${ids.length} artigo(s) movido(s) para rascunho`,
    );
    clearSelection();
    void fetchArticles();
  };

  const publishedCount = articles.filter((a) => a.published).length;
  const draftCount = articles.length - publishedCount;
  const noImageCount = articles.filter((a) => !a.image_url).length;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={FileText} label="Total de artigos" value={articles.length} />
        <MetricCard icon={Eye} label="Publicados" value={publishedCount} color="text-primary" />
        <MetricCard icon={EyeOff} label="Rascunhos" value={draftCount} color="text-gold-deep" />
        <MetricCard icon={ImageOff} label="Sem foto" value={noImageCount} color="text-destructive" />
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou resumo..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 rounded-lg bg-muted/40 p-1">
            {(["todos", "publicados", "rascunhos"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  status === s
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            value={`${sortKey}:${sortDir}`}
            aria-label="Ordenar artigos"
            onChange={(e) => {
              const [k, d] = e.target.value.split(":") as [SortKey, SortDir];
              setSortKey(k);
              setSortDir(d);
            }}
          >
            <option value="created_at:desc">Mais recentes</option>
            <option value="created_at:asc">Mais antigos</option>
            <option value="title:asc">Título (A–Z)</option>
            <option value="title:desc">Título (Z–A)</option>
            <option value="category:asc">Categoria (A–Z)</option>
            <option value="published:desc">Publicados primeiro</option>
            <option value="published:asc">Rascunhos primeiro</option>
          </select>
          <div className="flex gap-1 rounded-lg bg-muted/40 p-1">
            <button
              onClick={() => setView("table")}
              aria-label="Ver em lista"
              className={`rounded-md p-1.5 ${view === "table" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("grid")}
              aria-label="Ver em cartões"
              className={`rounded-md p-1.5 ${view === "grid" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          <Button size="sm" onClick={startCreate} className="bg-cta text-cta-foreground hover:bg-cta/90">
            <Plus className="mr-2 h-4 w-4" /> Novo artigo
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Mostrando {pageItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
          –{(currentPage - 1) * pageSize + pageItems.length} de {filtered.length} artigo(s)
          {filtered.length !== articles.length && ` (${articles.length} no total)`}
        </p>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Por página
          <select
            className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>


      {loading ? (
        <div className="mt-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="mt-4 border-dashed border-border bg-card">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {articles.length === 0
                ? "Nenhum artigo ainda. Crie o primeiro post do blog."
                : "Nenhum artigo corresponde aos filtros."}
            </p>
            {articles.length === 0 && (
              <Button size="sm" onClick={startCreate} className="bg-cta text-cta-foreground hover:bg-cta/90">
                <Plus className="mr-2 h-4 w-4" /> Novo artigo
              </Button>
            )}
          </CardContent>
        </Card>
      ) : view === "table" ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <SortHeader label="Artigo" sortKey="title" active={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Categoria" sortKey="category" active={sortKey} dir={sortDir} onSort={toggleSort} className="hidden sm:table-cell" />
                <SortHeader label="Publicado" sortKey="published" active={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Data" sortKey="created_at" active={sortKey} dir={sortDir} onSort={toggleSort} className="hidden md:table-cell" />
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((article) => (
                <tr
                  key={article.id}
                  className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/20"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Thumb url={article.image_url} alt={article.title} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{article.title}</p>
                        <p className="line-clamp-1 max-w-md text-xs text-muted-foreground">
                          {article.summary}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-5 py-3 text-muted-foreground sm:table-cell">
                    {article.category}
                  </td>
                  <td className="px-5 py-3">
                    <Switch
                      checked={article.published}
                      onCheckedChange={() => void togglePublished(article)}
                      aria-label="Alternar publicação"
                    />
                  </td>
                  <td className="hidden px-5 py-3 text-muted-foreground md:table-cell">
                    {new Date(article.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {article.published && (
                        <a
                          href={`/blog/${article.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                          aria-label="Ver no site"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(article)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => setToDelete(article)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((article) => (
            <Card key={article.id} className="overflow-hidden border-border bg-card">
              {article.image_url ? (
                <img
                  src={article.image_url}
                  alt={article.title}
                  className="aspect-video w-full object-cover"
                />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-muted/40 text-muted-foreground">
                  <ImageOff className="h-6 w-6" />
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                    {article.category}
                  </span>
                  <span>{new Date(article.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
                <h4 className="mt-2 line-clamp-2 font-semibold text-foreground">{article.title}</h4>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{article.summary}</p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={article.published}
                      onCheckedChange={() => void togglePublished(article)}
                      aria-label="Alternar publicação"
                    />
                    <span className="text-xs text-muted-foreground">
                      {article.published ? "Publicado" : "Rascunho"}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(article)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => setToDelete(article)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            aria-label="Página anterior"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(
              (p) =>
                p === 1 ||
                p === totalPages ||
                Math.abs(p - currentPage) <= 1,
            )
            .map((p, idx, arr) => (
              <span key={p} className="flex items-center gap-2">
                {idx > 0 && arr[idx - 1] !== p - 1 && (
                  <span className="text-xs text-muted-foreground">…</span>
                )}
                <Button
                  size="icon"
                  variant={p === currentPage ? "default" : "outline"}
                  className="h-8 w-8 text-xs"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              </span>
            ))}
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            aria-label="Próxima página"
            disabled={currentPage === totalPages}
            onClick={() => setPage(currentPage + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}


      <ArticleEditorDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        form={form}
        setForm={setForm}
        onSave={handleSave}
        saving={saving}
        isEditing={!!editing}
        slugTaken={slugTaken}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir artigo?</AlertDialogTitle>
            <AlertDialogDescription>
              "{toDelete?.title}" será removido permanentemente do blog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SortHeader({
  label,
  sortKey,
  active,
  dir,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = active === sortKey;
  const Icon = !isActive ? ChevronsUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={`px-5 py-3 font-medium text-muted-foreground ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-label={`Ordenar por ${label}`}
        className={`inline-flex items-center gap-1 transition-colors hover:text-foreground ${
          isActive ? "text-foreground" : ""
        }`}
      >
        {label}
        <Icon className="h-3.5 w-3.5" />
      </button>
    </th>
  );
}


function Thumb({ url, alt }: { url: string; alt: string }) {
  if (!url) {
    return (
      <div className="flex h-11 w-16 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
        <ImageOff className="h-4 w-4" />
      </div>
    );
  }
  return (
    <img src={url} alt={alt} className="h-11 w-16 shrink-0 rounded-md object-cover" />
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color = "text-foreground",
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
