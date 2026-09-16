/**
 * Rota interna do SaaS que o CapabilityGate consulta — colar como
 * `GET /api/xfts/gate` (Express, Next route handler ou TanStack server route).
 * Só ela conhece a chave do sistema; o browser nunca a recebe.
 *
 * Substitua `getCurrentUserId(request)` pela função de sessão já existente no SaaS
 * e `getActingAs(request)` pelo papel do usuário logado dentro do tenant.
 * IMPORTANTE: o papel vem SEMPRE da sessão do servidor, nunca de um parâmetro
 * enviado pelo browser — senão qualquer usuário abriria o painel admin.
 */
import { CapabilityDenied, requireRoute, type ActingAs } from "../lib/xfts-hub";

/** Dono, gerente, recepção e demais perfis com painel = TENANT_ADMIN. */
export type SaasRole = string;

export function actingAsFromRole(role: SaasRole | null | undefined): ActingAs {
  const admins = new Set([
    "owner",
    "dono",
    "admin",
    "super_admin",
    "moderator",
    "gerente",
    "manager",
    "recepcao",
    "recepção",
  ]);
  return role && admins.has(String(role).trim().toLowerCase()) ? "TENANT_ADMIN" : "TENANT";
}

export async function xftsGateHandler(
  request: Request,
  getCurrentUserId: (req: Request) => Promise<string | null>,
  getActingAs: (req: Request) => Promise<ActingAs>,
) {
  const app = process.env["XFTS_APP"]!;
  const apiKey = process.env["XFTS_APP_KEY"]!;
  const path = new URL(request.url).searchParams.get("path");
  if (!path) return new Response("path obrigatório", { status: 400 });

  const userId = await getCurrentUserId(request);
  if (!userId) return new Response("não autenticado", { status: 401 });

  const actingAs = await getActingAs(request);

  try {
    await requireRoute(app, userId, apiKey, path, actingAs);
    return Response.json({ allowed: true });
  } catch (err) {
    if (err instanceof CapabilityDenied) {
      return Response.json({ allowed: false, reason: err.message }, { status: 403 });
    }
    return Response.json({ allowed: false, reason: "indisponível" }, { status: 403 });
  }
}

/**
 * Middleware para as rotas de dados do SaaS: 403 real antes de qualquer consulta.
 *
 *   app.get("/api/relatorios/retencao", xftsGuard("reports.retention_analysis", getUserId, getActingAs), handler)
 */
export function xftsGuard(
  capability: string,
  getCurrentUserId: (req: any) => Promise<string | null>,
  getActingAs: (req: any) => Promise<ActingAs>,
) {
  return async (req: any, res: any, next: any) => {
    const userId = await getCurrentUserId(req);
    if (!userId) return res.status(401).json({ error: "não autenticado" });
    try {
      const { requireCan } = await import("../lib/xfts-hub");
      const actingAs = await getActingAs(req);
      await requireCan(
        process.env["XFTS_APP"]!,
        userId,
        process.env["XFTS_APP_KEY"]!,
        capability,
        actingAs,
      );
      next();
    } catch (err: any) {
      res.status(403).json({ error: err?.message ?? "Recurso não incluído no seu plano" });
    }
  };
}
