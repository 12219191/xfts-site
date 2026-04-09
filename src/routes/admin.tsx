import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, LogOut, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin - XFTS Blog" }],
  }),
  component: AdminPage,
});

interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  image_url: string;
  author: string;
  published: boolean;
  created_at: string;
}

function AdminPage() {
  const [isAuth, setIsAuth] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [editing, setEditing] = useState<Article | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", slug: "", summary: "", content: "", category: "Gestão", image_url: "", author: "Equipe XFTS", published: false });

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsAuth(false); setLoading(false); return; }
    setIsAuth(true);
    const { data } = await supabase.from("admin_users").select("id").eq("user_id", user.id).maybeSingle();
    setIsAdmin(!!data);
    if (data) fetchArticles();
    setLoading(false);
  };

  const fetchArticles = async () => {
    const { data } = await supabase.from("blog_articles").select("*").order("created_at", { ascending: false });
    if (data) setArticles(data);
  };

  useEffect(() => {
    checkAdmin();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { checkAdmin(); });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuth(false);
    setIsAdmin(false);
  };

  const generateSlug = (title: string) => title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleSave = async () => {
    if (editing) {
      await supabase.from("blog_articles").update(form).eq("id", editing.id);
    } else {
      await supabase.from("blog_articles").insert(form);
    }
    setEditing(null);
    setCreating(false);
    setForm({ title: "", slug: "", summary: "", content: "", category: "Gestão", image_url: "", author: "Equipe XFTS", published: false });
    fetchArticles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este artigo?")) return;
    await supabase.from("blog_articles").delete().eq("id", id);
    fetchArticles();
  };

  const startEdit = (article: Article) => {
    setEditing(article);
    setCreating(true);
    setForm({ title: article.title, slug: article.slug, summary: article.summary, content: article.content, category: article.category, image_url: article.image_url, author: article.author, published: article.published });
  };

  if (loading) return <div className="section-padding text-center text-muted-foreground">Carregando...</div>;

  if (!isAuth) {
    return (
      <div className="section-padding">
        <div className="container-wide mx-auto max-w-md">
          <h1 className="text-2xl font-bold text-foreground text-center">Admin - Login</h1>
          <Card className="mt-6 border-border bg-card"><CardContent className="p-6">
            <form onSubmit={handleLogin} className="grid gap-4">
              <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input placeholder="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              {authError && <p className="text-sm text-destructive">{authError}</p>}
              <Button type="submit" className="bg-primary text-primary-foreground">Entrar</Button>
            </form>
          </CardContent></Card>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="section-padding text-center">
        <h1 className="text-2xl font-bold text-foreground">Acesso Negado</h1>
        <p className="mt-2 text-muted-foreground">Sua conta não tem permissão de administrador.</p>
        <Button onClick={handleLogout} variant="outline" className="mt-4">Sair</Button>
      </div>
    );
  }

  return (
    <div className="section-padding">
      <div className="container-wide">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Painel Admin - Blog</h1>
          <div className="flex gap-2">
            <Button onClick={() => { setCreating(true); setEditing(null); setForm({ title: "", slug: "", summary: "", content: "", category: "Gestão", image_url: "", author: "Equipe XFTS", published: false }); }} className="bg-cta text-cta-foreground hover:bg-cta/90">
              <Plus className="mr-2 h-4 w-4" /> Novo Artigo
            </Button>
            <Button onClick={handleLogout} variant="outline"><LogOut className="mr-2 h-4 w-4" /> Sair</Button>
          </div>
        </div>

        {creating && (
          <Card className="mt-6 border-border bg-card"><CardContent className="p-6">
            <h2 className="text-lg font-semibold text-card-foreground">{editing ? "Editar Artigo" : "Novo Artigo"}</h2>
            <div className="mt-4 grid gap-4">
              <Input placeholder="Título" value={form.title} onChange={(e) => { setForm({ ...form, title: e.target.value, slug: editing ? form.slug : generateSlug(e.target.value) }); }} />
              <Input placeholder="Slug (URL)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              <Input placeholder="Resumo" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
              <Textarea placeholder="Conteúdo (use ## para subtítulos)" rows={10} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
              <div className="grid gap-4 sm:grid-cols-3">
                <select className="rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option>Gestão</option>
                  <option>Tecnologia</option>
                </select>
                <Input placeholder="URL da imagem" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
                <Input placeholder="Autor" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="rounded" />
                Publicado
              </label>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="bg-cta text-cta-foreground hover:bg-cta/90">Salvar</Button>
                <Button onClick={() => { setCreating(false); setEditing(null); }} variant="outline">Cancelar</Button>
              </div>
            </div>
          </CardContent></Card>
        )}

        <div className="mt-6 grid gap-4">
          {articles.map((article) => (
            <Card key={article.id} className="border-border bg-card">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-card-foreground">{article.title}</h3>
                    {article.published ? (
                      <span className="flex items-center gap-1 rounded-full bg-cta/10 px-2 py-0.5 text-xs text-cta"><Eye className="h-3 w-3" /> Publicado</span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"><EyeOff className="h-3 w-3" /> Rascunho</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{article.category} • {new Date(article.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(article)}><Edit className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(article.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {articles.length === 0 && <p className="text-center text-muted-foreground">Nenhum artigo encontrado.</p>}
        </div>
      </div>
    </div>
  );
}
