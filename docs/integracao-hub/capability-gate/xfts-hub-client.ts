/**
 * Cliente oficial do Control Center XFTS — colar como `src/lib/xfts-hub.ts` em cada SaaS FLEXUS.
 * Não editar: qualquer mudança de plano/capability é feita no hub (/admin/produtos → Capabilities).
 *
 * Variáveis de ambiente esperadas no SaaS:
 *   XFTS_HUB_URL      (padrão https://xfts-flexus.com)
 *   XFTS_APP_KEY      chave do sistema (NUNCA expor no browser)
 *   XFTS_APP          barbearia | clinica | estetica | crm | aba | casa360
 */

export type CapabilityMap = {
  routes: Record<string, string>;
  actions: Record<string, string>;
};

/**
 * Papel do usuário DENTRO do tenant, resolvido pela sessão do SaaS (nunca pelo browser).
 * "TENANT_ADMIN" = dono/gerente/recepção com acesso ao painel admin.
 * "TENANT" = cliente final ou profissional (portais).
 * Telas do painel admin estão cadastradas como "Administrador do cliente": enviar
 * "TENANT" para elas resulta em 403 legítimo.
 */
export type ActingAs = "TENANT" | "TENANT_ADMIN";

const HUB = (typeof process !== "undefined" && process.env?.["XFTS_HUB_URL"]) || "https://xfts-flexus.com";
const TTL = 60_000;

type Cached<T> = { value: T; at: number };
const capsCache = new Map<string, Cached<Set<string>>>();
let routesCache: Cached<CapabilityMap> | null = null;

export class CapabilityDenied extends Error {
  status = 403 as const;
  constructor(public capability: string, message = "Recurso não incluído no seu plano") {
    super(message);
  }
}

/** Capabilities liberadas para o usuário (formato antigo de entitlements segue disponível). */
export async function loadCapabilities(
  app: string,
  userId: string,
  apiKey: string,
): Promise<Set<string>> {
  const id = `${app}:${userId}`;
  const hit = capsCache.get(id);
  if (hit && Date.now() - hit.at < TTL) return hit.value;

  const res = await fetch(
    `${HUB}/api/public/entitlements?app=${encodeURIComponent(app)}&user_id=${encodeURIComponent(userId)}`,
    { headers: { "x-flexus-app-key": apiKey } },
  );
  if (!res.ok) throw new Error(`hub_entitlements_${res.status}`);
  const data = (await res.json()) as { capabilities?: string[] };
  const value = new Set(data.capabilities ?? []);
  capsCache.set(id, { value, at: Date.now() });
  return value;
}

/** Mapa tela → capability e ação → capability, cadastrado no hub. */
export async function loadCapabilityMap(app: string, apiKey: string): Promise<CapabilityMap> {
  if (routesCache && Date.now() - routesCache.at < TTL) return routesCache.value;
  const res = await fetch(`${HUB}/api/public/capability-routes?app=${encodeURIComponent(app)}`, {
    headers: { "x-flexus-app-key": apiKey },
  });
  if (!res.ok) throw new Error(`hub_capability_routes_${res.status}`);
  const data = (await res.json()) as Partial<CapabilityMap>;
  const value: CapabilityMap = { routes: data.routes ?? {}, actions: data.actions ?? {} };
  routesCache = { value, at: Date.now() };
  return value;
}

/** Somente apresentação (esconder/mostrar). Nunca é proteção suficiente. */
export function can(caps: Set<string>, key: string): boolean {
  return caps.has(key);
}

/**
 * Obrigatório no backend do SaaS antes de qualquer operação sensível.
 * Lança CapabilityDenied (403) — fail-closed também quando o hub não responde.
 */
export async function requireCan(
  app: string,
  userId: string,
  apiKey: string,
  capability: string,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${HUB}/api/public/capability-check`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-flexus-app-key": apiKey },
      body: JSON.stringify({ app, user_id: userId, capability, acting_as: "TENANT" }),
    });
  } catch {
    throw new CapabilityDenied(capability, "Não foi possível validar seu plano agora");
  }
  if (res.status === 403) {
    const body = (await res.json().catch(() => ({}))) as { reason?: string };
    throw new CapabilityDenied(capability, body.reason ?? "Recurso não incluído no seu plano");
  }
  if (!res.ok) throw new CapabilityDenied(capability, "Não foi possível validar seu plano agora");
}

/** Guard por rota: resolve a capability da tela pelo mapa do hub e valida no servidor. */
export async function requireRoute(
  app: string,
  userId: string,
  apiKey: string,
  path: string,
): Promise<void> {
  const map = await loadCapabilityMap(app, apiKey);
  const key = map.routes[path];
  if (!key) return; // tela sem capability vinculada = pública dentro do SaaS
  await requireCan(app, userId, apiKey, key);
}

/** Guard por ação, ex.: requireAction(..., "EXPORT:relatorios.csv"). */
export async function requireAction(
  app: string,
  userId: string,
  apiKey: string,
  actionKey: string,
): Promise<void> {
  const map = await loadCapabilityMap(app, apiKey);
  const key = map.actions[actionKey];
  if (!key) throw new CapabilityDenied(actionKey, "Ação não cadastrada no Control Center");
  await requireCan(app, userId, apiKey, key);
}

export function clearXftsCache() {
  capsCache.clear();
  routesCache = null;
}
