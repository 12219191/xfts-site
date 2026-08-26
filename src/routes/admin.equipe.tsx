import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ModuleGuard } from "@/components/admin/admin-context";
import {
  grantAdminRole,
  listAdminTeam,
  revokeAdminRole,
  type TeamMember,
} from "@/lib/admin-team.functions";
import { ADMIN_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, type AdminRole } from "@/lib/admin-rbac";
import { UserPlus, X } from "lucide-react";

export const Route = createFileRoute("/admin/equipe")({
  component: () => (
    <ModuleGuard module="equipe">
      <EquipePage />
    </ModuleGuard>
  ),
});

function EquipePage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("suporte");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const result = await listAdminTeam();
      if ("error" in result) toast.error(result.error);
      else setMembers(result.members);
    } catch {
      toast.error("Falha ao carregar a equipe.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const grant = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await grantAdminRole({ data: { email, role } });
      if ("error" in result) toast.error(result.error);
      else {
        toast.success("Papel concedido.");
        setEmail("");
        load();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao conceder papel.");
    }
    setBusy(false);
  };

  const revoke = async (userId: string, r: AdminRole) => {
    try {
      const result = await revokeAdminRole({ data: { userId, role: r } });
      if ("error" in result) toast.error(result.error);
      else {
        toast.success("Papel removido.");
        load();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover papel.");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Equipe e permissões</h1>
        <p className="text-sm text-muted-foreground">
          Cada pessoa vê apenas os módulos do seu papel. Alterações ficam registradas na auditoria.
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-5">
          <form onSubmit={grant} className="flex flex-wrap items-center gap-2">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e-mail do usuário já cadastrado"
              type="email"
              className="max-w-xs"
              required
            />
            <Select value={role} onValueChange={(v) => setRole(v as AdminRole)}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ADMIN_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={busy}>
              <UserPlus className="mr-2 h-4 w-4" /> Conceder
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {members.map((m) => (
          <Card key={m.userId} className="border-border bg-card">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <span className="text-sm text-foreground">{m.email}</span>
              <div className="flex flex-wrap gap-1.5">
                {m.roles.length === 0 && (
                  <span className="text-xs text-muted-foreground">sem papéis</span>
                )}
                {m.roles.map((r) => (
                  <Badge key={r} variant="secondary" className="gap-1">
                    {ROLE_LABELS[r]}
                    <button onClick={() => revoke(m.userId, r)} aria-label={`Remover ${ROLE_LABELS[r]}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
