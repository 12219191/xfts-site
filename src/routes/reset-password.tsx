import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir Senha - XFTS Inteligência Analítica" },
      { name: "description", content: "Redefina sua senha de acesso ao XFTS FLEXUS." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setIsRecovery(true);
        setChecking(false);
      }
    });

    const verify = async () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(hash.replace(/^#/, ""));

      // 1) Hash-based tokens (#access_token=...&type=recovery)
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      }

      // 2) PKCE code flow (?code=...)
      const code = params.get("code");
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }

      // 3) token_hash flow (?token_hash=...&type=recovery)
      const tokenHash = params.get("token_hash") ?? params.get("token");
      const type = params.get("type") ?? hashParams.get("type");
      if (tokenHash && type === "recovery") {
        await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
      }

      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setIsRecovery(Boolean(data.session) || hash.includes("type=recovery"));
      setChecking(false);
    };

    verify();
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);


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
      navigate({ to: "/minha-conta" });
    }
  };

  if (checking) {
    return (
      <section className="section-padding">
        <div className="container-wide mx-auto max-w-md text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Validando link de recuperação...</p>
        </div>
      </section>
    );
  }

  if (!isRecovery) {

    return (
      <section className="section-padding">
        <div className="container-wide mx-auto max-w-md text-center">
          <KeyRound className="mx-auto h-16 w-16 text-muted-foreground/40" />
          <h1 className="mt-6 text-2xl font-bold text-foreground">Link inválido</h1>
          <p className="mt-2 text-muted-foreground">
            Este link de recuperação é inválido ou expirou.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <a href="/login">Voltar ao login</a>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding">
      <div className="container-wide mx-auto max-w-md">
        <Card>
          <CardContent className="p-6">
            <h1 className="text-xl font-bold text-foreground">Redefinir Senha</h1>
            <p className="mt-1 text-sm text-muted-foreground">Escolha uma nova senha.</p>
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
