/**
 * Sessão de Suporte XFTS — emissão, troca, revalidação e encerramento (server-only).
 * Toda escrita no banco passa pelo `SupportStore` (substituível nos testes).
 */
import { FLEXUS_APPS, getFlexusApp, type FlexusAppKey } from "@/lib/flexus-apps";
import { appApiKey, safeEqual } from "@/lib/sso.server";
import {
  SUPPORT_SESSION_TTL_S,
  SUPPORT_TOKEN_TTL_S,
  SUPPORT_TOKEN_TYP,
  bindingError,
  isWriteAllowed,
  sessionState,
  signSupportToken,
  supportDisplayName,
  supportViewer,
  verifySupportToken,
  type SupportRole,
  type SupportSessionRow,
} from "@/lib/support-session";

export const SUPPORT_FLAG_PREFIX = "support_session.";

export interface SupportStore {
  flagEnabled(app: string): Promise<boolean>;
  allFlags(): Promise<Record<string, boolean>>;
  setFlag(app: string, enabled: boolean, by: string): Promise<void>;
  /** Encerra sessões abertas do mesmo atendente+tenant+app; devolve as encerradas. */
  endOpenFor(actorId: string, tenantId: string, appKey: string, reason: string): Promise<SupportSessionRow[]>;
  insert(row: Omit<SupportSessionRow, "id" | "created_at">): Promise<SupportSessionRow | null>;
  /** Consumo atômico do jti (uso único, dentro da validade). */
  consume(jti: string, nowIso: string, sessionExpiresIso: string): Promise<SupportSessionRow | null>;
  get(id: string): Promise<SupportSessionRow | null>;
  /** Encerra se ainda aberta; devolve a linha encerrada ou null. */
  end(id: string, reason: string, by: string | null): Promise<SupportSessionRow | null>;
  listOpen(): Promise<SupportSessionRow[]>;
}

function dbStore(): SupportStore {
  const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;
  const nowIso = () => new Date().toISOString();
  return {
    async flagEnabled(app) {
      const db = await admin();
      const { data } = await db
        .from("integration_settings")
        .select("value")
        .eq("key", SUPPORT_FLAG_PREFIX + app)
        .maybeSingle();
      return (data?.value as { enabled?: boolean } | null)?.enabled === true;
    },
    async allFlags() {
      const db = await admin();
      const { data } = await db
        .from("integration_settings")
        .select("key, value")
        .like("key", `${SUPPORT_FLAG_PREFIX}%`);
      const out: Record<string, boolean> = {};
      for (const r of data ?? []) {
        out[r.key.slice(SUPPORT_FLAG_PREFIX.length)] =
          (r.value as { enabled?: boolean } | null)?.enabled === true;
      }
      return out;
    },
    async setFlag(app, enabled, by) {
      const db = await admin();
      const { error } = await db.from("integration_settings").upsert([
        { key: SUPPORT_FLAG_PREFIX + app, value: { enabled } as never, updated_at: nowIso(), updated_by: by },
      ]);
      if (error) throw new Error(error.message);
    },
    async endOpenFor(actorId, tenantId, appKey, reason) {
      const db = await admin();
      const { data } = await db
        .from("support_sessions")
        .update({ ended_at: nowIso(), ended_reason: reason })
        .eq("actor_id", actorId)
        .eq("tenant_id", tenantId)
        .eq("app_key", appKey)
        .is("ended_at", null)
        .select("*");
      return (data ?? []) as SupportSessionRow[];
    },
    async insert(row) {
      const db = await admin();
      const { data, error } = await db.from("support_sessions").insert(row as never).select("*").maybeSingle();
      if (error) return null;
      return data as SupportSessionRow | null;
    },
    async consume(jti, now, sessionExpires) {
      const db = await admin();
      const { data } = await db
        .from("support_sessions")
        .update({ used_at: now, session_expires_at: sessionExpires })
        .eq("jti", jti)
        .is("used_at", null)
        .is("ended_at", null)
        .gt("token_expires_at", now)
        .select("*")
        .maybeSingle();
      return data as SupportSessionRow | null;
    },
    async get(id) {
      const db = await admin();
      const { data } = await db.from("support_sessions").select("*").eq("id", id).maybeSingle();
      return data as SupportSessionRow | null;
    },
    async end(id, reason, by) {
      const db = await admin();
      const { data } = await db
        .from("support_sessions")
        .update({ ended_at: nowIso(), ended_reason: reason, revoked_by: by })
        .eq("id", id)
        .is("ended_at", null)
        .select("*")
        .maybeSingle();
      return data as SupportSessionRow | null;
    },
    async listOpen() {
      const db = await admin();
      const { data } = await db
        .from("support_sessions")
        .select("*")
        .is("ended_at", null)
        .order("created_at", { ascending: false })
        .limit(200);
      return (data ?? []) as SupportSessionRow[];
    },
  };
}

let override: SupportStore | null = null;
/** Somente testes. */
export function setSupportStoreForTests(store: SupportStore | null) {
  override = store;
}
function store(): SupportStore {
  return override ?? dbStore();
}

function secret(): string {
  const s = process.env["XFTS_SUPPORT_SESSION_SECRET"];
  if (!s) throw new Error("XFTS_SUPPORT_SESSION_SECRET não configurado");
  return s;
}

async function audit(
  action: string,
  row: Pick<SupportSessionRow, "id" | "actor_id" | "actor_email" | "role" | "tenant_id" | "app_key">,
  extra: Record<string, unknown> = {},
  reason: string | null = null,
  actor?: { id: string; email: string },
) {
  const { recordAudit } = await import("@/lib/admin-audit.server");
  await recordAudit({
    actorId: actor?.id ?? row.actor_id,
    actorEmail: actor?.email ?? row.actor_email,
    action,
    targetType: "support_session",
    targetId: row.id,
    after: { app: row.app_key, tenant_id: row.tenant_id, role: row.role, ...extra },
    reason,
  });
}

/** Qual app é dono desta chave? (null = nenhuma). */
export function appForKey(provided: string): FlexusAppKey | null {
  if (!provided) return null;
  for (const a of FLEXUS_APPS) {
    const k = appApiKey(a.key);
    if (k && safeEqual(provided, k)) return a.key;
  }
  return null;
}

export async function supportFlagEnabled(app: string) {
  return store().flagEnabled(app);
}
export async function supportFlags() {
  return store().allFlags();
}

export async function setSupportFlag(app: string, enabled: boolean, actor: { id: string; email: string }) {
  if (!getFlexusApp(app)) throw new Error("Sistema inválido");
  const before = await store().flagEnabled(app);
  await store().setFlag(app, enabled, actor.id);
  const { recordAudit } = await import("@/lib/admin-audit.server");
  await recordAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "support_session.flag",
    targetType: "app",
    targetId: app,
    before: { support_session_enabled: before },
    after: { support_session_enabled: enabled },
  });
}

// ---------- Emissão (Control Center) ----------

export async function issueSupportSession(input: {
  actor: { id: string; email: string; name: string };
  role: SupportRole;
  tenantId: string;
  appKey: string;
  reason: string;
  ticket: string | null;
  environment: string;
  nowMs?: number;
}): Promise<{ url: string; sessionId: string } | { error: string }> {
  const app = getFlexusApp(input.appKey);
  if (!app || !app.url) return { error: "Sistema não disponível para sessão de suporte." };
  if (!(await store().flagEnabled(app.key))) {
    return { error: "Este sistema ainda não usa a Sessão de Suporte XFTS." };
  }
  const now = Math.floor((input.nowMs ?? Date.now()) / 1000);
  const exp = now + SUPPORT_TOKEN_TTL_S;
  const jti = crypto.randomUUID();

  // Uma sessão aberta por atendente+tenant+app: a anterior é encerrada.
  const replaced = await store().endOpenFor(input.actor.id, input.tenantId, app.key, "replaced");
  for (const r of replaced) await audit("support_session.replaced", r);

  const row = await store().insert({
    jti,
    actor_id: input.actor.id,
    actor_email: input.actor.email,
    actor_name: input.actor.name,
    role: input.role,
    tenant_id: input.tenantId,
    app_key: app.key,
    reason: input.reason,
    ticket: input.ticket,
    environment: input.environment,
    token_expires_at: new Date(exp * 1000).toISOString(),
    used_at: null,
    session_expires_at: null,
    ended_at: null,
    ended_reason: null,
    revoked_by: null,
  });
  if (!row) return { error: "Não foi possível abrir a sessão de suporte." };

  const token = await signSupportToken(secret(), {
    typ: SUPPORT_TOKEN_TYP,
    actor_id: input.actor.id,
    actor_email: input.actor.email,
    actor_name: input.actor.name,
    role: input.role,
    tenant_id: input.tenantId,
    app_key: app.key,
    aud: app.key,
    reason: input.reason,
    ticket: input.ticket,
    jti,
    iat: now,
    exp,
  });
  await audit("support_session.issued", row, { ticket: input.ticket }, input.reason);
  // Fragmento: não vai a logs de servidor nem ao Referer.
  return { url: `${app.url}/support#token=${encodeURIComponent(token)}`, sessionId: row.id };
}

// ---------- Endpoints públicos ----------

export interface Outcome {
  status: number;
  body: Record<string, unknown>;
}

/** Troca do token pela sessão. */
export async function verifyAndConsume(token: string, providedKey: string, nowMs = Date.now()): Promise<Outcome> {
  const caller = appForKey(providedKey);
  if (!caller) return { status: 401, body: { error: "Chave de API inválida" } };

  const check = await verifySupportToken(secret(), token, nowMs);
  if (!check.ok) return { status: 401, body: { error: "Token inválido ou expirado" } };
  const c = check.claims;
  if (c.app_key !== caller) return { status: 403, body: { error: "Token emitido para outro sistema" } };
  if (!(await store().flagEnabled(caller))) {
    return { status: 403, body: { error: "Sessão de suporte não habilitada para este sistema" } };
  }

  const sessionExpires = new Date(nowMs + SUPPORT_SESSION_TTL_S * 1000).toISOString();
  const row = await store().consume(c.jti, new Date(nowMs).toISOString(), sessionExpires);
  if (!row) return { status: 401, body: { error: "Token já utilizado ou expirado" } };
  if (row.tenant_id !== c.tenant_id || row.app_key !== c.app_key || row.role !== c.role) {
    await store().end(row.id, "revoked", null);
    return { status: 401, body: { error: "Token inválido" } };
  }

  const { resolveUserEntitlements } = await import("@/lib/entitlements.server");
  const ent = await resolveUserEntitlements(row.tenant_id, row.app_key);
  if (!ent.ativo) {
    await store().end(row.id, "ended", null);
    await audit("support_session.denied", row, { motivo: "tenant sem assinatura ativa" });
    return { status: 403, body: { error: "Tenant sem assinatura ativa neste sistema" } };
  }
  const { resolveCapabilities } = await import("@/lib/capabilities.server");
  const capabilities = await resolveCapabilities({
    productKey: row.app_key,
    entitlements: ent,
    viewer: supportViewer(row.role),
  });
  await audit("support_session.used", row, { session_expires_at: sessionExpires });

  return {
    status: 200,
    body: {
      session_id: row.id,
      actor: {
        id: row.actor_id,
        email: row.actor_email,
        display_name: supportDisplayName(row.actor_name, row.actor_email),
      },
      role: row.role,
      can_write: isWriteAllowed(row.role),
      tenant_id: row.tenant_id,
      app: row.app_key,
      ticket: row.ticket,
      session_expires_at: sessionExpires,
      capabilities,
      entitlements: { ativo: ent.ativo, recursos: ent.features, limites: ent.limites },
    },
  };
}

export type BoundSession =
  | { ok: true; row: SupportSessionRow; app: FlexusAppKey }
  | { ok: false; status: number; error: string; row?: SupportSessionRow };

/**
 * `support_session_id` nunca é credencial solta: exige a chave do app dono da
 * sessão e o mesmo tenant. Divergência = 403 auditado.
 */
export async function bindSession(
  sessionId: string,
  providedKey: string,
  tenantId: string,
  opts: { requireActive?: boolean; nowMs?: number } = {},
): Promise<BoundSession> {
  const caller = appForKey(providedKey);
  if (!caller) return { ok: false, status: 401, error: "Chave de API inválida" };
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return { ok: false, status: 403, error: "Sessão de suporte inválida" };
  const row = await store().get(sessionId);
  if (!row) return { ok: false, status: 403, error: "Sessão de suporte inválida" };
  const mismatch = bindingError(row, caller, tenantId);
  if (mismatch) {
    await audit("support_session.mismatch", row, { caller_app: caller, tenant_informado: tenantId, motivo: mismatch });
    return { ok: false, status: 403, error: "Sessão de suporte não pertence a este sistema/tenant" };
  }
  const state = sessionState(row, opts.nowMs);
  if (opts.requireActive !== false && state !== "active") {
    return { ok: false, status: 401, error: "Sessão de suporte encerrada ou expirada", row };
  }
  return { ok: true, row, app: caller };
}

export async function sessionStatus(sessionId: string, providedKey: string, tenantId: string, nowMs = Date.now()): Promise<Outcome> {
  const b = await bindSession(sessionId, providedKey, tenantId, { requireActive: false, nowMs });
  if (!b.ok) return { status: b.status, body: { error: b.error } };
  const state = sessionState(b.row, nowMs);
  if (state === "expired" && !b.row.ended_at) {
    const ended = await store().end(b.row.id, "expired", null);
    if (ended) await audit("support_session.expired", ended);
  }
  return {
    status: 200,
    body: {
      active: state === "active",
      state,
      role: b.row.role,
      can_write: isWriteAllowed(b.row.role),
      session_expires_at: b.row.session_expires_at,
      ended_reason: b.row.ended_reason,
    },
  };
}

export async function endBySystem(sessionId: string, providedKey: string, tenantId: string): Promise<Outcome> {
  const b = await bindSession(sessionId, providedKey, tenantId, { requireActive: false });
  if (!b.ok) return { status: b.status, body: { error: b.error } };
  const ended = await store().end(b.row.id, "ended", null);
  if (ended) await audit("support_session.ended", ended);
  return { status: 200, body: { ok: true } };
}

/** Registro de escrita feita na sessão. Suporte (somente leitura) recebe 403. */
export async function recordWrite(
  sessionId: string,
  providedKey: string,
  tenantId: string,
  action: { action: string; resource?: string | null; detail?: unknown },
  nowMs = Date.now(),
): Promise<Outcome> {
  const b = await bindSession(sessionId, providedKey, tenantId, { nowMs });
  if (!b.ok) return { status: b.status, body: { allowed: false, error: b.error } };
  if (!isWriteAllowed(b.row.role)) {
    await audit("support_session.write_denied", b.row, { acao: action.action, recurso: action.resource ?? null });
    return { status: 403, body: { allowed: false, error: "Sessão de suporte somente leitura" } };
  }
  await audit("support_session.write", b.row, {
    acao: action.action,
    recurso: action.resource ?? null,
    detalhe: action.detail ?? null,
  });
  return { status: 200, body: { allowed: true } };
}

// ---------- Control Center ----------

export async function listOpenSessions(nowMs = Date.now()) {
  const rows = await store().listOpen();
  return rows
    .map((r) => ({ ...r, state: sessionState(r, nowMs) }))
    .filter((r) => r.state === "active" || r.state === "pending");
}

export async function revokeSupportSession(id: string, actor: { id: string; email: string }, reason: string) {
  const ended = await store().end(id, "revoked", actor.id);
  if (!ended) return { error: "Sessão já encerrada." };
  await audit("support_session.revoked", ended, {}, reason, actor);
  return { ok: true as const };
}

/** Rotina: marca como expiradas as sessões vencidas. */
export async function expireSupportSessions(nowMs = Date.now()): Promise<number> {
  const rows = await store().listOpen();
  let n = 0;
  for (const r of rows) {
    if (sessionState(r, nowMs) !== "expired") continue;
    const ended = await store().end(r.id, "expired", null);
    if (ended) {
      n++;
      await audit("support_session.expired", ended);
    }
  }
  return n;
}
