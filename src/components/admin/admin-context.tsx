import { createContext, useContext } from "react";
import { canAccess, type AdminModule, type AdminRole } from "@/lib/admin-rbac";
import { ShieldAlert } from "lucide-react";

export interface AdminContextValue {
  userId: string;
  email: string;
  roles: AdminRole[];
}

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin deve ser usado dentro do Control Center");
  return ctx;
}

/** Bloqueia o conteúdo quando o perfil não tem acesso ao módulo. */
export function ModuleGuard({
  module,
  children,
}: {
  module: AdminModule;
  children: React.ReactNode;
}) {
  const { roles } = useAdmin();
  if (canAccess(roles, module)) return <>{children}</>;
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
      <ShieldAlert className="h-8 w-8 text-muted-foreground" />
      <h3 className="mt-3 text-base font-semibold text-foreground">Sem permissão</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Seu perfil não tem acesso a esta área do Control Center. Fale com um superadmin se
        precisar dessa permissão.
      </p>
    </div>
  );
}
