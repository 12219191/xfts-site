import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { LogIn, UserPlus, Loader2, Mail } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { getFlexusApp, type FlexusAppKey } from "@/lib/flexus-apps";
import { createSsoLink } from "@/lib/sso.functions";
import { getStripeEnvironment } from "@/lib/stripe";



export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string; app?: FlexusAppKey } => {
    const value = search["redirect"];
    const rawApp = search["app"];
    const out: { redirect?: string; app?: FlexusAppKey } = {};
    // Apenas caminhos internos (mesma origem) são aceitos.
    if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) {
      out.redirect = value;
    }
    // Sistema de origem (xfts-flexus6/7/8) — validado contra o catálogo.
    if (typeof rawApp === "string") {
      const meta = getFlexusApp(rawApp as FlexusAppKey);
      if (meta?.available) out.app = meta.key;
    }
    return out;
  },
  head: () => ({
    meta: [
      { title: "Login - XFTS Inteligência Analítica" },
      { name: "description", content: "Acesse sua conta XFTS e entre nos sistemas FLEXUS de Clínica, Barbearia, Estética, ABA, CRM e Casa360°." },
      { property: "og:title", content: "Login - XFTS Inteligência Analítica" },
      { property: "og:description", content: "Acesse sua conta XFTS e entre nos sistemas FLEXUS." },
      { property: "og:url", content: "https://xfts-flexus.com/login" },
      { name: "twitter:title", content: "Login - XFTS Inteligência Analítica" },
      { name: "twitter:description", content: "Acesse sua conta XFTS e entre nos sistemas FLEXUS." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});


function GoogleButton({ redirect, app }: { redirect?: string; app?: FlexusAppKey }) {
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (redirect) params.set("redirect", redirect);
    if (app) params.set("app", app);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: params.toString()
        ? `${window.location.origin}/login?${params.toString()}`
        : window.location.origin,
    });
    if (result.error) {
      toast.error("Erro ao conectar com Google.");
      setLoading(false);
    }
    if (result.redirected) return;
    setLoading(false);
  };


  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleGoogle}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
      )}
      Continuar com Google
    </Button>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { redirect, app } = Route.useSearch();
  const appMeta = app ? getFlexusApp(app) : undefined;
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const goAfterAuth = async () => {
    // Veio de um sistema FLEXUS: abre o sistema direto por SSO.
    if (app) {
      try {
        const env = getStripeEnvironment() === "live" ? "live" : "sandbox";
        const result = await createSsoLink({ data: { app, environment: env } });
        if (!("error" in result)) {
          window.location.href = result.url;
          return;
        }
        toast.info(result.error);
      } catch {
        toast.error("Não foi possível abrir o sistema. Use Meus Sistemas.");
      }
      navigate({ to: "/minha-conta" });
      return;
    }
    if (redirect) {
      navigate({ to: redirect });
    } else {
      navigate({ to: "/minha-conta" });
    }
  };


  // Redirect if already logged in
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    goAfterAuth();
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials"
        ? "Email ou senha incorretos."
        : error.message);
    } else {
      toast.success("Login realizado com sucesso!");
      goAfterAuth();
    }
  };


  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Conta criada! Verifique seu email para confirmar o cadastro.");
      setMode("login");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Informe seu email.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
      setMode("login");
    }
  };

  return (
    <>
      <section className="gradient-primary py-12 text-center">
        <div className="container-wide">
          <Logo size={56} variant="mark" className="mx-auto mb-4" />
          <h1 className="text-3xl font-extrabold text-primary-foreground md:text-4xl">

            {mode === "login" && "Acesse sua conta"}
            {mode === "signup" && "Crie sua conta"}
            {mode === "forgot" && "Recuperar senha"}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-primary-foreground/70">
            {mode === "login" && "Entre para gerenciar seu sistema FLEXUS."}
            {mode === "signup" && "Cadastre-se para começar a usar o FLEXUS."}
            {mode === "forgot" && "Enviaremos um link para redefinir sua senha."}
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide mx-auto max-w-md">
          <Card className="border-border">
            <CardContent className="p-6">
              {mode === "login" && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                    Entrar
                  </Button>
                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setMode("forgot")}
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center"><Separator /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">ou</span>
                    </div>
                  </div>
                  <GoogleButton redirect={redirect} />
                  <Separator />
                  <p className="text-center text-sm text-muted-foreground">
                    Não tem conta?{" "}
                    <button
                      type="button"
                      className="font-medium text-primary hover:underline"
                      onClick={() => setMode("signup")}
                    >
                      Criar conta
                    </button>
                  </p>
                </form>
              )}

              {mode === "signup" && (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar senha</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Repita a senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    Criar Conta
                  </Button>
                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center"><Separator /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">ou</span>
                    </div>
                  </div>
                  <GoogleButton redirect={redirect} />
                  <Separator />
                  <p className="text-center text-sm text-muted-foreground">
                    Já tem conta?{" "}
                    <button
                      type="button"
                      className="font-medium text-primary hover:underline"
                      onClick={() => setMode("login")}
                    >
                      Fazer login
                    </button>
                  </p>
                </form>
              )}

              {mode === "forgot" && (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    Enviar Link de Recuperação
                  </Button>
                  <Separator />
                  <p className="text-center text-sm text-muted-foreground">
                    Lembrou a senha?{" "}
                    <button
                      type="button"
                      className="font-medium text-primary hover:underline"
                      onClick={() => setMode("login")}
                    >
                      Voltar ao login
                    </button>
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
