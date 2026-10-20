import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Separator } from "@/components/ui/separator";
import { getAdminSession } from "@/lib/admin-core.functions";
import { canAccess, ROLE_LABELS, type AdminModule, type AdminRole } from "@/lib/admin-rbac";
import { AdminContext } from "@/components/admin/admin-context";
import {
  AlertTriangle,
  BookOpen,
  ClipboardList,
  CreditCard,
  FileText,
  Gift,
  Inbox,
  Landmark,
  LayoutDashboard,
  LogOut,
  Package,
  PlugZap,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Control Center — XFTS FLEXUS" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

interface NavItem {
  to: string;
  label: string;
  module: AdminModule;
  icon: typeof FileText;
  group: string;
}

const NAV: NavItem[] = [
  { to: "/admin/dashboard", label: "Visão executiva", module: "dashboard", icon: LayoutDashboard, group: "Visão geral" },
  { to: "/admin/clientes", label: "Clientes", module: "clientes", icon: Users, group: "Clientes" },
  { to: "/admin/assinaturas", label: "Assinaturas", module: "assinaturas", icon: CreditCard, group: "Receita" },
  { to: "/admin/financeiro", label: "Financeiro", module: "financeiro", icon: Landmark, group: "Receita" },
  { to: "/admin/cobranca", label: "Cobrança", module: "cobranca", icon: AlertTriangle, group: "Receita" },
  { to: "/admin/cortesias", label: "Cortesias", module: "cortesias", icon: Gift, group: "Receita" },
  { to: "/admin/promocoes", label: "Promoções", module: "promocoes", icon: Ticket, group: "Receita" },
  { to: "/admin/produtos", label: "Produtos", module: "produtos", icon: Package, group: "Catálogo" },
  { to: "/admin/conteudo", label: "Blog", module: "conteudo", icon: FileText, group: "Marketing" },
  { to: "/admin/leads", label: "Leads", module: "leads", icon: Inbox, group: "Marketing" },
  { to: "/admin/integracoes", label: "Integrações", module: "integracoes", icon: PlugZap, group: "Sistema" },
  { to: "/admin/equipe", label: "Equipe", module: "equipe", icon: ShieldCheck, group: "Sistema" },
  { to: "/admin/auditoria", label: "Auditoria", module: "auditoria", icon: ClipboardList, group: "Sistema" },
  { to: "/admin/seguranca", label: "Segurança da conta", module: "dashboard", icon: ShieldCheck, group: "Sistema" },
];

function AdminLayout() {
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);
  const [session, setSession] = useState<{ userId: string; email: string; roles: AdminRole[] } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [sessionError, setSessionError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setIsAuth(false);
      setSession(null);
      setLoading(false);
      return;
    }
    setIsAuth(true);
    setSessionError("");
    try {
      const result = await getAdminSession();
      setSession(result);
    } catch (err) {
      setSession(null);
      setSessionError(err instanceof Error ? err.message : "Erro ao verificar permissões.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { refresh(); });
    return () => subscription.unsubscribe();
  }, [refresh]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos. Se você criou a conta com o Google, use o botão \"Continuar com Google\". Se ainda não tem senha, use \"Primeiro acesso ou esqueci a senha\"."
          : error.message,
      );
    }
  };

  const handleGoogle = async () => {
    setAuthError("");
    setGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/login?redirect=%2Fadmin`,
    });
    if (result.error) {
      setAuthError("Não foi possível entrar com o Google. Tente novamente.");
      setGoogleLoading(false);
      return;
    }
    if (result.redirected) return;
    setGoogleLoading(false);
    refresh();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuth(false);
    setSession(null);
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Carregando Control Center...</div>;
  }

  if (!isAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="w-full max-w-sm">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BookOpen className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground">XFTS Control Center</h1>
            <p className="mt-1 text-sm text-muted-foreground">Área restrita de gestão interna</p>
          </div>
          <Card className="mt-6 border-border bg-card shadow-lg"><CardContent className="p-6">
            <form onSubmit={handleLogin} className="grid gap-4">
              <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input placeholder="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              {authError && <p className="text-sm text-destructive">{authError}</p>}
              <Button type="submit" className="bg-primary text-primary-foreground">Entrar</Button>
            </form>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><Separator /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogle}
              disabled={googleLoading}
            >
              {googleLoading ? "Conectando..." : "Continuar com Google"}
            </Button>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              <a className="text-primary hover:underline" href="/login?redirect=%2Fadmin">
                Primeiro acesso ou esqueci a senha
              </a>
            </p>
          </CardContent></Card>
        </div>
      </div>
    );
  }

  if (!session || session.roles.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold text-foreground">
          {sessionError ? "Não foi possível verificar suas permissões" : "Acesso Negado"}
        </h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          {sessionError
            ? `Houve uma falha técnica ao consultar seu perfil. Detalhe: ${sessionError}`
            : "Sua conta não tem perfil administrativo no Control Center."}
        </p>
        <div className="mt-4 flex gap-2">
          <Button onClick={refresh} variant="outline">Tentar novamente</Button>
          <Button onClick={handleLogout} variant="ghost">Sair</Button>
        </div>
      </div>
    );
  }

  const visible = NAV.filter((item) => canAccess(session.roles, item.module));
  const groups = [...new Set(visible.map((i) => i.group))];
  const current = visible.find((i) => pathname.startsWith(i.to));

  return (
    <AdminContext.Provider value={session}>
      <div className="flex min-h-screen bg-surface">
        <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:block">
          <div className="flex h-14 items-center border-b border-border px-5">
            <span className="text-sm font-bold tracking-wide text-foreground">Control Center</span>
          </div>
          <nav className="mt-3 space-y-4 px-3 pb-8">
            {groups.map((group) => (
              <div key={group}>
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group}
                </p>
                <div className="space-y-0.5">
                  {visible.filter((i) => i.group === group).map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                      activeProps={{ className: "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm bg-primary/10 font-medium text-primary" }}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-card px-4 md:px-6">
            <div className="flex gap-1 overflow-x-auto md:hidden">
              {visible.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-lg p-2 text-muted-foreground"
                  activeProps={{ className: "rounded-lg p-2 bg-primary/10 text-primary" }}
                >
                  <item.icon className="h-4 w-4" />
                </Link>
              ))}
            </div>
            <h2 className="hidden text-sm font-medium text-foreground md:block">
              {current?.label ?? "Control Center"}
            </h2>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-medium text-foreground">{session.email}</p>
                <p className="text-[11px] text-muted-foreground">
                  {session.roles.map((r) => ROLE_LABELS[r]).join(" · ")}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={handleLogout} className="text-muted-foreground">
                <LogOut className="mr-2 h-4 w-4" /> Sair
              </Button>
            </div>
          </header>

          <main className="p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
