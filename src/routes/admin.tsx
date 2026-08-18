import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AdminSubscriptionsPanel } from "@/components/AdminSubscriptionsPanel";
import { BlogPanel } from "@/components/admin/BlogPanel";
import { LogOut, FileText, CreditCard, Settings, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin - XFTS Blog" }],
  }),
  component: AdminPage,
});

type Tab = "blog" | "subscriptions" | "settings";

function AdminPage() {
  const [isAuth, setIsAuth] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("blog");

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsAuth(false); setLoading(false); return; }
    setIsAuth(true);
    const { data } = await supabase.from("admin_users").select("id").eq("user_id", user.id).maybeSingle();
    setIsAdmin(!!data);
    setLoading(false);
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
          <span className="text-sm font-bold tracking-wide text-foreground">FLEXUS Admin</span>
        </div>
        <nav className="mt-2 space-y-0.5 px-3">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                activeTab === item.id
                  ? "bg-primary/10 font-medium text-primary"
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
      <div className="min-w-0 flex-1">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
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
          {activeTab === "blog" && <BlogPanel />}

          {activeTab === "subscriptions" && <AdminSubscriptionsPanel />}

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
    </div>
  );
}
