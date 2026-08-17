import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminSubscriptionsPanel } from "@/components/AdminSubscriptionsPanel";
import {
  Plus, Edit, Trash2, LogOut, Eye, EyeOff, FileText, CreditCard, Settings,
  BarChart3, Users, BookOpen,
} from "lucide-react";
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

interface Subscription {
  id: string;
  user_id: string;
  product_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  created_at: string | null;
  environment: string;
  stripe_subscription_id: string;
}

type Tab = "blog" | "subscriptions" | "settings";

const emptyForm = { title: "", slug: "", summary: "", content: "", category: "Gestão", image_url: "", author: "Equipe XFTS", published: false };

function AdminPage() {
  const [isAuth, setIsAuth] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [editing, setEditing] = useState<Article | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState<Tab>("blog");

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsAuth(false); setLoading(false); return; }
    setIsAuth(true);
    const { data } = await supabase.from("admin_users").select("id").eq("user_id", user.id).maybeSingle();
    setIsAdmin(!!data);
    if (data) {
      fetchArticles();
      fetchSubscriptions();
    }
    setLoading(false);
  };

  const fetchArticles = async () => {
    const { data } = await supabase.from("blog_articles").select("*").order("created_at", { ascending: false });
    if (data) setArticles(data);
  };

  const fetchSubscriptions = async () => {
    const { data } = await supabase.from("subscriptions").select("*").order("created_at", { ascending: false });
    if (data) setSubscriptions(data as Subscription[]);
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
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    fetchArticles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este artigo?")) return;
    await supabase.from("blog_articles").delete().eq("id", id);
    fetchArticles();
  };

  const startEdit = (article: Article) => {
    setEditing(article);
    setForm({ title: article.title, slug: article.slug, summary: article.summary, content: article.content, category: article.category, image_url: article.image_url, author: article.author, published: article.published });
    setModalOpen(true);
  };

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-muted-foreground">Carregando...</div>;

  if (!isAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="w-full max-w-sm">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BookOpen className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground">Admin FLEXUS</h1>
            <p className="mt-1 text-sm text-muted-foreground">Entre com suas credenciais</p>
          </div>
          <Card className="mt-6 border-border bg-card shadow-lg"><CardContent className="p-6">
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
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-foreground">Acesso Negado</h1>
        <p className="mt-2 text-muted-foreground">Sua conta não tem permissão de administrador.</p>
        <Button onClick={handleLogout} variant="outline" className="mt-4">Sair</Button>
      </div>
    );
  }

  const publishedCount = articles.filter((a) => a.published).length;
  const draftCount = articles.filter((a) => !a.published).length;
  const activeSubsCount = subscriptions.filter((s) => s.status === "active" || s.status === "trialing").length;

  const sidebarItems: { id: Tab; label: string; icon: typeof FileText }[] = [
    { id: "blog", label: "Blog", icon: FileText },
    { id: "subscriptions", label: "Assinaturas", icon: CreditCard },
    { id: "settings", label: "Configurações", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-border bg-card md:block">
        <div className="flex h-14 items-center border-b border-border px-5">
          <span className="text-sm font-bold text-foreground tracking-wide">FLEXUS Admin</span>
        </div>
        <nav className="mt-2 space-y-0.5 px-3">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                activeTab === item.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
          {/* Mobile tab selector */}
          <div className="flex gap-2 md:hidden">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`rounded-lg p-2 ${activeTab === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
              >
                <item.icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <h2 className="hidden text-sm font-medium text-foreground md:block">
            {sidebarItems.find((s) => s.id === activeTab)?.label}
          </h2>
          <Button size="sm" variant="ghost" onClick={handleLogout} className="text-muted-foreground">
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </header>

        <main className="p-6">
          {/* Metrics */}
          {activeTab === "blog" && (
            <>
              <div className="grid gap-4 sm:grid-cols-4">
                <MetricCard icon={FileText} label="Total de Artigos" value={articles.length} />
                <MetricCard icon={Eye} label="Publicados" value={publishedCount} color="text-cta" />
                <MetricCard icon={EyeOff} label="Rascunhos" value={draftCount} color="text-amber-500" />
                <MetricCard icon={Users} label="Assinaturas Ativas" value={activeSubsCount} color="text-blue-500" />
              </div>

              <div className="mt-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Artigos</h3>
                <Button size="sm" onClick={startCreate} className="bg-cta text-cta-foreground hover:bg-cta/90">
                  <Plus className="mr-2 h-4 w-4" /> Novo Artigo
                </Button>
              </div>

              {/* Articles Table */}
              <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-5 py-3 font-medium text-muted-foreground">Título</th>
                      <th className="hidden px-5 py-3 font-medium text-muted-foreground sm:table-cell">Categoria</th>
                      <th className="px-5 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="hidden px-5 py-3 font-medium text-muted-foreground md:table-cell">Data</th>
                      <th className="px-5 py-3 font-medium text-muted-foreground text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.map((article) => (
                      <tr key={article.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3 font-medium text-foreground">{article.title}</td>
                        <td className="hidden px-5 py-3 text-muted-foreground sm:table-cell">{article.category}</td>
                        <td className="px-5 py-3">
                          {article.published ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-cta/10 px-2.5 py-0.5 text-xs font-medium text-cta">
                              <Eye className="h-3 w-3" /> Publicado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600">
                              <EyeOff className="h-3 w-3" /> Rascunho
                            </span>
                          )}
                        </td>
                        <td className="hidden px-5 py-3 text-muted-foreground md:table-cell">
                          {new Date(article.created_at).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(article)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(article.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {articles.length === 0 && (
                      <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">Nenhum artigo encontrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Subscriptions tab */}
          {activeTab === "subscriptions" && <AdminSubscriptionsPanel />}


          {/* Settings tab */}
          {activeTab === "settings" && (
            <div className="max-w-md">
              <h3 className="text-lg font-semibold text-foreground">Configurações</h3>
              <p className="mt-2 text-sm text-muted-foreground">Configurações avançadas do painel administrativo.</p>
              <Card className="mt-6 border-border bg-card">
                <CardContent className="p-6 text-sm text-muted-foreground">
                  Em breve: Gerenciamento de usuários admin, webhooks e integrações.
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Edit/Create Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Artigo" : "Novo Artigo"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 mt-4">
            <Input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: editing ? form.slug : generateSlug(e.target.value) })} />
            <Input placeholder="Slug (URL)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <Input placeholder="Resumo" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            <Textarea placeholder="Conteúdo (use ## para subtítulos)" rows={10} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            <div className="grid gap-4 sm:grid-cols-3">
              <select className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
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
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="bg-cta text-cta-foreground hover:bg-cta/90">Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color = "text-foreground" }: { icon: typeof FileText; label: string; value: number; color?: string }) {
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
