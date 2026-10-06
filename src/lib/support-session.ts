/**
 * Sessão de Suporte XFTS — regras puras (sem I/O, testáveis).
 *
 * O papel interno (XFTS_SUPPORT / XFTS_SUPERADMIN) só existe quando vem de um
 * token assinado pelo Hub com chave dedicada (XFTS_SUPPORT_SESSION_SECRET).
 * `acting_as` enviado por sistema externo continua sem poder pedir escopo interno.
 */
import type { CapabilityViewer } from "@/lib/capabilities";

export const SUPPORT_ROLES = ["XFTS_SUPPORT", "XFTS_SUPERADMIN"] as const;
export type SupportRole = (typeof SUPPORT_ROLES)[number];

/** Validade do token de abertura (uso único). */
export const SUPPORT_TOKEN_TTL_S = 5 * 60;
/** Duração máxima da sessão no produto. */
export const SUPPORT_SESSION_TTL_S = 60 * 60;

export const SUPPORT_TOKEN_TYP = "xfts_support";

export interface SupportClaims {
  typ: typeof SUPPORT_TOKEN_TYP;
  actor_id: string;
  actor_email: string;
  actor_name: string;
  role: SupportRole;
  tenant_id: string;
  app_key: string;
  aud: string;
  reason: string;
  ticket: string | null;
  jti: string;
  iat: number;
  exp: number;
}

export interface SupportSessionRow {
  id: string;
  jti: string;
  actor_id: string;
  actor_email: string;
  actor_name: string;
  role: SupportRole;
  tenant_id: string;
  app_key: string;
  reason: string;
  ticket: string | null;
  environment: string;
  token_expires_at: string;
  used_at: string | null;
  session_expires_at: string | null;
  ended_at: string | null;
  ended_reason: string | null;
  revoked_by: string | null;
  created_at: string;
}

export function isSupportRole(v: unknown): v is SupportRole {
  return typeof v === "string" && (SUPPORT_ROLES as readonly string[]).includes(v);
}

/** Só o superadmin XFTS escreve. Suporte é somente leitura. */
export function isWriteAllowed(role: SupportRole): boolean {
  return role === "XFTS_SUPERADMIN";
}

/** Viewer de capabilities vindo da sessão assinada (nunca do acting_as). */
export function supportViewer(role: SupportRole): CapabilityViewer {
  return role === "XFTS_SUPERADMIN"
    ? { actingAs: "XFTS_SUPERADMIN", isXftsSupport: true, isXftsSuperadmin: true }
    : { actingAs: "XFTS_SUPPORT", isXftsSupport: true, isXftsSuperadmin: false };
}

/** Nome exibido no produto: nunca o admin do cliente. */
export function supportDisplayName(name: string, email: string): string {
  const base = name.trim() || email.split("@")[0] || "Atendente";
  return `${base} (XFTS Suporte)`;
}

export type SessionState = "pending" | "active" | "ended" | "expired";

export function sessionState(row: SupportSessionRow, nowMs = Date.now()): SessionState {
  if (row.ended_at) return row.ended_reason === "expired" ? "expired" : "ended";
  if (!row.used_at) {
    return new Date(row.token_expires_at).getTime() > nowMs ? "pending" : "expired";
  }
  if (!row.session_expires_at || new Date(row.session_expires_at).getTime() <= nowMs) {
    return "expired";
  }
  return "active";
}

/** A sessão pertence ao app que está chamando e ao tenant da requisição? */
export function bindingError(
  row: Pick<SupportSessionRow, "app_key" | "tenant_id">,
  callerApp: string,
  tenantId: string,
): string | null {
  if (row.app_key !== callerApp) return "sessão de suporte pertence a outro sistema";
  if (row.tenant_id !== tenantId) return "sessão de suporte pertence a outro tenant";
  return null;
}

// ---------- Token (HMAC-SHA256, Web Crypto) ----------

const encoder = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(input: string): Uint8Array<ArrayBuffer> {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const bin = atob(input.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function signSupportToken(secret: string, claims: SupportClaims): Promise<string> {
  const header = b64url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT", kid: "xfts-support-1" })));
  const body = b64url(encoder.encode(JSON.stringify(claims)));
  const data = `${header}.${body}`;
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(data));
  return `${data}.${b64url(new Uint8Array(sig))}`;
}

export type TokenCheck =
  | { ok: true; claims: SupportClaims }
  | { ok: false; status: 401; error: string };

export async function verifySupportToken(
  secret: string,
  token: string,
  nowMs = Date.now(),
): Promise<TokenCheck> {
  const bad = (error: string): TokenCheck => ({ ok: false, status: 401, error });
  if (typeof token !== "string" || token.length > 6000) return bad("token inválido");
  const parts = token.split(".");
  if (parts.length !== 3) return bad("token inválido");
  const [header, body, sig] = parts as [string, string, string];
  let valid = false;
  try {
    valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      b64urlDecode(sig),
      encoder.encode(`${header}.${body}`),
    );
  } catch {
    return bad("assinatura inválida");
  }
  if (!valid) return bad("assinatura inválida");
  let claims: SupportClaims;
  try {
    claims = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as SupportClaims;
  } catch {
    return bad("token inválido");
  }
  if (
    claims.typ !== SUPPORT_TOKEN_TYP ||
    !isSupportRole(claims.role) ||
    !claims.jti ||
    !claims.tenant_id ||
    !claims.app_key ||
    claims.aud !== claims.app_key
  ) {
    return bad("token inválido");
  }
  if (!claims.exp || claims.exp * 1000 <= nowMs) return bad("token expirado");
  if (claims.exp - claims.iat > SUPPORT_TOKEN_TTL_S) return bad("token inválido");
  return { ok: true, claims };
}
