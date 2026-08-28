import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { getFlexusApp, type FlexusAppKey } from "@/lib/flexus-apps";
import { createSsoLink } from "@/lib/sso.functions";
import { getStripeEnvironment } from "@/lib/stripe";

type Search = {
  app?: FlexusAppKey;
  redirect?: string;
  error?: string;
  error_code?: string;
};

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const out: Search = {};
    const rawRedirect = search["redirect"];
    if (typeof rawRedirect === "string" && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")) {
      out.redirect = rawRedirect;
    }
    const rawApp = search["app"];
    if (typeof rawApp === "string") {
      const meta = getFlexusApp(rawApp as FlexusAppKey);
      if (meta?.available) out.app = meta.key;
    }
    if (typeof search["error"] === "string") out.error = search["error"];
    if (typeof search["error_code"] === "string") out.error_code = search["error_code"];
    return out;
  },
  head: () => ({
    meta: [
      { title: "Redefinir Senha - XFTS Inteligência Analítica" },
      { name: "description", content: "Redefina sua senha de acesso ao XFTS FLEXUS." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

type Phase = "checking" | "recovery" | "expired" | "invalid";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { app, redirect, error: searchError, error_code: searchErrorCode } = Route.useSearch();
  const appMeta = app ? getFlexusApp(app) : undefined;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>("checking");
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") setPhase("recovery");
    });

    const verify = async () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(hash.replace(/^#/, ""));

      // Link expirado / recusado pelo provedor de autenticação.
      const errCode =
        searchErrorCode ?? hashParams.get("error_code") ?? (searchError ? "access_denied" : hashParams.get("error"));
      if (errCode) {
        if (!active) return;
        setPhase("expired");
        return;
      }

      let recovered = false;

      // 1) Tokens no hash (#access_token=...&type=recovery)
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        recovered = !error;
      }

      // 2) Fluxo PKCE (?code=...)
      const code = params.get("code");
      if (!recovered && code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        recovered = !error;
      }

      // 3) Fluxo token_hash (?token_hash=...&type=recovery)
      const tokenHash = params.get("token_hash") ?? params.get("token");
      const type = params.get("type") ?? hashParams.get("type");
      if (!recovered && tokenHash && type === "recovery") {
        const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
        recovered = !error;
      }

      if (!active) return;
      // Sessão comum (sem link de recuperação) não libera o formulário.
      if (recovered || type === "recovery") {
        setPhase("recovery");
      } else {
        setPhase((current) => (current === "recovery" ? current : "invalid"));
      }
    };

    void verify();
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [searchError, searchErrorCode]);

  const goAfterReset = async () => {
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
    navigate({ to: redirect ?? "/minha-conta" });
  };

  const handleReset = async (e: React.FormEvent) => {
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
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Senha atualizada com sucesso!");
      void goAfterReset();
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) {
      toast.error("Informe seu email.");
      return;
    }
    setResending(true);
    const resetParams = new URLSearchParams();
    if (app) resetParams.set("app", app);
    if (redirect) resetParams.set("redirect", redirect);
    const query = resetParams.toString();
    const { error } = await supabase.auth.resetPasswordForEmail(resendEmail, {
      redirectTo: `${window.location.origin}/reset-password${query ? `?${query}` : ""}`,
    });
    setResending(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("rate")
          ? "Muitas tentativas. Aguarde alguns minutos e tente novamente."
          : error.message,
      );
    } else {
      toast.success("Novo link enviado! Verifique sua caixa de entrada.");
    }
  };

  if (phase === "checking") {
    return (
      <section className="section-padding">
        <div className="container-wide mx-auto max-w-md text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Validando link de recuperação...</p>
        </div>
      </section>
    );
  }

  if (phase === "expired") {
    return (
      <section className="section-padding">
        <div className="container-wide mx-auto max-w-md">
          <Logo size={56} variant="mark" className="mx-auto mb-6" />
          <Card>
            <CardContent className="p-6">
              <h1 className="text-xl font-bold text-foreground">O link expirou</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Links de recuperação valem por pouco tempo e só podem ser usados uma vez.
                Informe seu e-mail para receber um novo.
                {appMeta && <> Depois de redefinir, abriremos o <strong>{appMeta.name}</strong> automaticamente.</>}
              </p>
              <form onSubmit={handleResend} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resend-email">Email</Label>
                  <Input
                    id="resend-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={resending}>
                  {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Enviar novo link
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  if (phase === "invalid") {
    return (
      <section className="section-padding">
        <div className="container-wide mx-auto max-w-md text-center">
          <KeyRound className="mx-auto h-16 w-16 text-muted-foreground/40" />
          <h1 className="mt-6 text-2xl font-bold text-foreground">Link inválido</h1>
          <p className="mt-2 text-muted-foreground">
            Esta página só pode ser aberta pelo link enviado por e-mail. Para trocar a senha,
            peça um novo link em "Esqueci minha senha".
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild variant="outline">
              <a href={app ? `/login?app=${app}` : "/login"}>Ir para o login</a>
            </Button>
            <Button asChild variant="ghost">
              <a href="/minha-conta">Minha conta</a>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding">
      <div className="container-wide mx-auto max-w-md">
        <Logo size={56} variant="mark" className="mx-auto mb-6" />
        <Card>
          <CardContent className="p-6">
            <h1 className="text-xl font-bold text-foreground">Redefinir Senha</h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Escolha uma nova senha.
              {appMeta && <> Em seguida abriremos o <strong>{appMeta.name}</strong>.</>}
            </p>
            <form onSubmit={handleReset} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirmar nova senha</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Salvar Nova Senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
