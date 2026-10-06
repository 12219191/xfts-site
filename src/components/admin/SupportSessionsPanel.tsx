import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck } from "lucide-react";
import {
  getSupportOverview,
  revokeSupportSessionFn,
  setSupportSessionFlag,
  type SupportOverview,
} from "@/lib/support-session.functions";

const ROLE_LABEL: Record<string, string> = {
  XFTS_SUPPORT: "Suporte (leitura)",
  XFTS_SUPERADMIN: "Superadmin (leitura e escrita)",
};

function remaining(iso: string | null) {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "vencida";
  return `${Math.ceil(ms / 60000)} min`;
}

/** Fluxo de suporte por sistema e sessões de suporte XFTS abertas. */
export function SupportSessionsPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const [data, setData] = useState<SupportOverview | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const r = await getSupportOverview().catch(() => ({ error: "Falha ao carregar" }));
    if ("error" in r) toast.error(r.error);
    else setData(r);
  };

  useEffect(() => {
    void load();
  }, [refreshKey]);

  const toggle = async (app: string, enabled: boolean) => {
    setBusy(true);
    const r = await setSupportSessionFlag({ data: { app, enabled } }).catch((e: Error) => ({ error: e.message }));
    if ("error" in r) toast.error(r.error);
    else toast.success(enabled ? "Sistema passou a usar a Sessão de Suporte XFTS." : "Sistema voltou ao fluxo antigo.");
    setBusy(false);
    void load();
  };

  const revoke = async (id: string) => {
    const reason = window.prompt("Motivo da revogação (mínimo 5 caracteres):") ?? "";
    if (reason.trim().length < 5) return;
    const r = await revokeSupportSessionFn({ data: { id, reason } }).catch((e: Error) => ({ error: e.message }));
    if ("error" in r) toast.error(r.error);
    else toast.success("Sessão revogada.");
    void load();
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Sessões de Suporte XFTS</h2>
        </div>

        <div>
          <p className="text-xs font-medium text-foreground">Fluxo de suporte por sistema</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {data?.flags.map((f) => (
              <div key={f.app} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm text-foreground">{f.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {f.enabled ? "Sessão de Suporte XFTS" : "Fluxo antigo"}
                  </p>
                </div>
                <Switch
                  checked={f.enabled}
                  disabled={busy || !data.canManageFlags}
                  onCheckedChange={(v) => toggle(f.app, v)}
                  aria-label={`Sessão de suporte para ${f.name}`}
                />
              </div>
            ))}
          </div>
          {data && !data.canManageFlags && (
            <p className="mt-1 text-[11px] text-muted-foreground">Só superadmin altera o fluxo.</p>
          )}
        </div>

        <div>
          <p className="text-xs font-medium text-foreground">Sessões ativas</p>
          {data?.sessions.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">Nenhuma sessão de suporte aberta.</p>
          )}
          <div className="mt-2 space-y-2">
            {data?.sessions.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                <div className="text-xs">
                  <p className="text-sm text-foreground">
                    {s.actor_name || s.actor_email} → {s.tenant_email}
                  </p>
                  <p className="text-muted-foreground">
                    {s.app_key} · {ROLE_LABEL[s.role] ?? s.role}
                    {s.ticket ? ` · ticket ${s.ticket}` : ""} · {s.reason}
                  </p>
                  <p className="text-muted-foreground">
                    {s.state === "pending"
                      ? `Aguardando abertura (link expira em ${remaining(s.token_expires_at)})`
                      : `Em uso · restam ${remaining(s.session_expires_at)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={s.state === "active" ? "default" : "secondary"}>
                    {s.state === "active" ? "ativa" : "pendente"}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => revoke(s.id)}>
                    Revogar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
