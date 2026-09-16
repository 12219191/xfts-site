/**
 * Rota interna do SaaS que o CapabilityGate consulta — colar como
 * `GET /api/xfts/gate` (Express, Next route handler ou TanStack server route).
 * Só ela conhece a chave do sistema; o browser nunca a recebe.
 *
 * Substitua `getCurrentUserId(request)` pela função de sessão já existente no SaaS.
 */
import { CapabilityDenied, requireRoute } from "../lib/xfts-hub";

export async function xftsGateHandler(request: Request, getCurrentUserId: (req: Request) => Promise<string | null>) {
  const app = process.env["XFTS_APP"]!;
  const apiKey = process.env["XFTS_APP_KEY"]!;
  const path = new URL(request.url).searchParams.get("path");
  if (!path) return new Response("path obrigatório", { status: 400 });

  const userId = await getCurrentUserId(request);
  if (!userId) return new Response("não autenticado", { status: 401 });

  try {
    await requireRoute(app, userId, apiKey, path);
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
 *   app.get("/api/relatorios/retencao", xftsGuard("reports.retention_analysis"), handler)
 */
export function xftsGuard(capability: string, getCurrentUserId: (req: any) => Promise<string | null>) {
  return async (req: any, res: any, next: any) => {
    const userId = await getCurrentUserId(req);
    if (!userId) return res.status(401).json({ error: "não autenticado" });
    try {
      const { requireCan } = await import("../lib/xfts-hub");
      await requireCan(process.env["XFTS_APP"]!, userId, process.env["XFTS_APP_KEY"]!, capability);
      next();
    } catch (err: any) {
      res.status(403).json({ error: err?.message ?? "Recurso não incluído no seu plano" });
    }
  };
}
