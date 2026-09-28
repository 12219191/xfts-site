/**
 * Assinatura/validação dos tokens de SSO (hub -> sistemas FLEXUS).
 * HMAC-SHA256 via Web Crypto, compatível com o runtime de edge.
 */
import type { FlexusAppKey } from "@/lib/flexus-apps";

export interface SsoPayload {
  sub: string; // user_id
  email: string;
  app: FlexusAppKey;
  plan: string | null;
  /** Papel do portador do token. Hoje só o titular usa SSO. */
  role?: "owner";
  /** Finalidade: acesso normal do titular ou sessão de suporte da XFTS. */
  purpose?: "owner" | "support";

  /** Assentos de equipe liberados pelo plano (null = ilimitado). */
  seats?: number | null;
  jti: string;
  iat: number;
  exp: number;
}

const encoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): Uint8Array<ArrayBuffer> {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const bin = atob(input.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function ssoSecret(): string {
  const secret = process.env["FLEXUS_SSO_SECRET"];
  if (!secret) throw new Error("FLEXUS_SSO_SECRET não configurado");
  return secret;
}

export async function signSsoToken(payload: SsoPayload): Promise<string> {
  const header = base64UrlEncode(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const data = `${header}.${body}`;
  const sig = await crypto.subtle.sign("HMAC", await getKey(ssoSecret()), encoder.encode(data));
  return `${data}.${base64UrlEncode(new Uint8Array(sig))}`;
}

export async function verifySsoToken(token: string): Promise<SsoPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const valid = await crypto.subtle.verify(
    "HMAC",
    await getKey(ssoSecret()),
    base64UrlDecode(sig!),
    encoder.encode(`${header}.${body}`),
  );
  if (!valid) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body!))) as SsoPayload;
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Chave de API de cada sistema (usada por ele para falar com o hub). */
export function appApiKey(app: FlexusAppKey): string | undefined {
  const map: Record<string, string | undefined> = {
    barbearia: process.env["FLEXUS_APP_KEY_BARBEARIA"],
    crm: process.env["FLEXUS_APP_KEY_CRM"],
    casa360: process.env["FLEXUS_APP_KEY_CASA360"],
    estetica: process.env["FLEXUS_APP_KEY_ESTETICA"],
  };
  return map[app];
}

/** Comparação em tempo constante. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Assina o corpo do webhook de provisionamento enviado aos sistemas. */
export async function signBody(secret: string, body: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await getKey(secret), encoder.encode(body));
  return base64UrlEncode(new Uint8Array(sig));
}

/** Mesma assinatura HMAC-SHA256, porém em hexadecimal (formato aceito pelo CRM). */
export async function signBodyHex(secret: string, body: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await getKey(secret), encoder.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
