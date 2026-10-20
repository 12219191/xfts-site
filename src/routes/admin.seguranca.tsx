import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  getMfaStatus,
  generateMfaRecoveryCodes,
  useMfaRecoveryCode,
  resetUserMfa,
  type MfaStatus,
} from "@/lib/mfa.functions";

export const Route = createFileRoute("/admin/seguranca")({
  head: () => ({ meta: [{ title: "Segurança da conta — Control Center" }, { name: "robots", content: "noindex" }] }),
  component: SegurancaPage,
});

function SegurancaPage() {
  const [st, setSt] = useState<MfaStatus | null>(null);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    await supabase.auth.refreshSession();
    const r = await getMfaStatus();
    if ("error" in r) toast.error(r.error);
    else setSt(r);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const startEnroll = async () => {
    setBusy(true);
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.all ?? []) if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `XFTS ${Date.now()}` });
    setBusy(false);
    if (error || !data) return toast.error(error?.message ?? "Falha ao iniciar cadastro");
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const verify = async () => {
    setBusy(true);
    let factorId = enroll?.id;
    if (!factorId) {
      const { data } = await supabase.auth.mfa.listFactors();
      factorId = data?.totp.find((f) => f.status === "verified")?.id;
    }
    if (!factorId) {
      setBusy(false);
      return toast.error("Nenhum fator cadastrado.");
    }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    setBusy(false);
    if (error) return toast.error("Código incorreto ou expirado.");
    setCode("");
    const wasEnroll = !!enroll;
    setEnroll(null);
    toast.success("Segundo fator verificado.");
    await load();
    if (wasEnroll) {
      const r = await generateMfaRecoveryCodes();
      if ("codes" in r) setCodes(r.codes);
    }
  };

  const regen = async () => {
    const r = await generateMfaRecoveryCodes();
    if ("error" in r) return toast.error(r.error);
    setCodes(r.codes);
    void load();
  };

  const useRecovery = async () => {
    const r = await useMfaRecoveryCode({ data: { code: recovery } });
    if ("error" in r) return toast.error(r.error);
    setRecovery("");
    toast.success("Código aceito. Cadastre um novo app autenticador.");
    await load();
  };

  const reset = async (userId: string, email: string) => {
    const reason = window.prompt(`Motivo para redefinir o segundo fator de ${email}:`);
    if (!reason) return;
    const r = await resetUserMfa({ data: { userId, reason } });
    if ("error" in r) return toast.error(r.error);
    toast.success(`Fator redefinido (${r.removed} removido).`);
    void load();
  };

  if (!st) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Segurança da conta</h1>
        <p className="text-sm text-muted-foreground">
          App autenticador (TOTP) para ações sensíveis: sessões de suporte, cortesias, reembolsos, integrações.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Situação:</span>
            {st.hasFactor ? <Badge>App autenticador cadastrado</Badge> : <Badge variant="secondary">Sem segundo fator</Badge>}
            {st.aal === "aal2" ? <Badge>Sessão verificada</Badge> : <Badge variant="outline">Sessão não verificada</Badge>}
            <span className="text-sm text-muted-foreground">
              Obrigatório a partir de: {st.enforceAfter ? new Date(st.enforceAfter).toLocaleString("pt-BR") : "não definido (período de migração)"}
            </span>
          </div>

          {!st.hasFactor && !enroll && (
            <Button type="button" onClick={startEnroll} disabled={busy}>Cadastrar app autenticador</Button>
          )}

          {enroll && (
            <div className="space-y-2">
              <p className="text-sm">Escaneie o QR code no seu app autenticador e digite o código de 6 dígitos.</p>
              <img src={enroll.qr} alt="QR code para cadastrar o app autenticador" className="h-44 w-44 rounded bg-card" />
              <p className="text-xs text-muted-foreground">Chave manual: <code>{enroll.secret}</code></p>
            </div>
          )}

          {(enroll || (st.hasFactor && st.aal !== "aal2")) && (
            <div className="flex max-w-sm items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="mfa-code">Código do app</Label>
                <Input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
              <Button type="button" onClick={verify} disabled={busy || code.trim().length < 6}>Verificar</Button>
            </div>
          )}

          {st.hasFactor && st.aal === "aal2" && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">Códigos de recuperação restantes: {st.recoveryRemaining}</span>
              <Button type="button" variant="outline" onClick={regen}>Gerar novos 10 códigos</Button>
            </div>
          )}

          {codes && (
            <div className="rounded-lg border border-border p-4">
              <p className="mb-2 text-sm font-medium">Guarde estes códigos agora. Eles não serão mostrados de novo e cada um vale uma vez.</p>
              <ul className="grid grid-cols-2 gap-1 font-mono text-sm">{codes.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
          )}

          {st.hasFactor && st.aal !== "aal2" && (
            <div className="flex max-w-sm items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="mfa-recovery">Perdeu o app? Código de recuperação</Label>
                <Input id="mfa-recovery" value={recovery} onChange={(e) => setRecovery(e.target.value)} />
              </div>
              <Button type="button" variant="outline" onClick={useRecovery} disabled={!recovery.trim()}>Usar</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {st.team && (
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-3 text-lg font-semibold">Equipe — cadastro do segundo fator</h2>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground"><th className="py-2">E-mail</th><th>Papéis</th><th>Segundo fator</th><th /></tr></thead>
              <tbody>
                {st.team.map((m) => (
                  <tr key={m.userId} className="border-t border-border">
                    <td className="py-2">{m.email}</td>
                    <td>{m.roles.join(", ")}</td>
                    <td>{m.hasFactor ? <Badge>Cadastrado</Badge> : <Badge variant="secondary">Pendente</Badge>}</td>
                    <td className="text-right">
                      {m.hasFactor && (
                        <Button type="button" size="sm" variant="outline" onClick={() => reset(m.userId, m.email)}>Redefinir</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
