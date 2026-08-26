import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, MailPlus, UserPlus, Users } from "lucide-react";
import {
  cancelInvite,
  getTeamOverview,
  inviteTeammate,
  type TeamOverview,
} from "@/lib/invites.functions";

const STATUS_LABEL: Record<string, string> = {
  pending: "Convite enviado",
  accepted: "Ativo",
  revoked: "Cancelado",
  expired: "Expirado",
};

/** Gestão de assentos e convites de equipe pelo próprio cliente. */
export function TeamInvites() {
  const [data, setData] = useState<TeamOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [appKey, setAppKey] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await getTeamOverview();
      setData(result);
      setAppKey((current) => current || result.seats[0]?.appKey || "");
    } catch {
      setData({ invites: [], seats: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setSending(true);
    const result = await inviteTeammate({
      data: {
        appKey,
        email: email.trim(),
        note: note.trim(),
        origin: typeof window !== "undefined" ? window.location.origin : "",
      },
    });
    setSending(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(`Convite enviado para ${result.invite.email}.`);
    setEmail("");
    setNote("");
    load();
  };

  const handleCancel = async (id: string) => {
    const result = await cancelInvite({ data: { id } });
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Convite cancelado.");
    load();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando equipe...
        </CardContent>
      </Card>
    );
  }

  if (!data || data.seats.length === 0) {
    return null;
  }

  const selected = data.seats.find((s) => s.appKey === appKey) ?? data.seats[0]!;
  const semVagas = selected.disponiveis !== null && selected.disponiveis <= 0;

  return (
    <Card className="border-border">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Minha equipe</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.seats.map((seat) => (
            <button
              key={seat.appKey}
              onClick={() => setAppKey(seat.appKey)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                seat.appKey === selected.appKey
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/40"
              }`}
            >
              <p className="text-sm font-semibold text-foreground">{seat.appName}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {seat.usados} de {seat.limite === null ? "ilimitados" : seat.limite} usuários
              </p>
            </button>
          ))}
        </div>

        <div className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[1.4fr_1.6fr_auto]">
          <div className="grid gap-1.5">
            <Label>E-mail do convidado</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pessoa@empresa.com"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Recado (opcional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Você vai cuidar dos agendamentos"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleInvite}
              disabled={sending || semVagas || !email.trim()}
              className="w-full bg-primary text-primary-foreground sm:w-auto"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" /> Convidar
                </>
              )}
            </Button>
          </div>
        </div>

        {semVagas && (
          <p className="text-sm text-muted-foreground">
            As {selected.limite} vagas do seu plano no {selected.appName} já estão ocupadas. Faça
            upgrade para convidar mais pessoas.
          </p>
        )}

        <div className="space-y-2">
          {data.invites.filter((i) => i.appKey === selected.appKey).length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              <MailPlus className="h-4 w-4" /> Nenhum convite enviado para o {selected.appName}
              ainda.
            </div>
          ) : (
            data.invites
              .filter((i) => i.appKey === selected.appKey)
              .map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {invite.status === "pending"
                        ? `Expira em ${new Date(invite.expiresAt).toLocaleDateString("pt-BR")}`
                        : invite.acceptedAt
                          ? `Aceito em ${new Date(invite.acceptedAt).toLocaleDateString("pt-BR")}`
                          : new Date(invite.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={invite.status === "accepted" ? "default" : "secondary"}>
                      {STATUS_LABEL[invite.status] ?? invite.status}
                    </Badge>
                    {invite.status === "pending" && (
                      <Button size="sm" variant="ghost" onClick={() => handleCancel(invite.id)}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
