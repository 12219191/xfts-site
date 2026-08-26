/**
 * Convites de equipe (server-only).
 *
 * O titular da assinatura convida pessoas por e-mail para usar o sistema
 * contratado. O limite de convites ativos respeita o entitlement de usuários
 * do plano — o próprio titular ocupa uma vaga.
 */
import { getFlexusApp } from "@/lib/flexus-apps";
import { resolveUserEntitlements } from "@/lib/entitlements.server";

export const INVITE_TTL_DAYS = 7;

export interface InviteRow {
  id: string;
  appKey: string;
  appName: string;
  email: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  note: string | null;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
}

export interface SeatUsage {
  appKey: string;
  appName: string;
  limite: number | null;
  usados: number;
  disponiveis: number | null;
}

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function newToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function mapRow(row: Record<string, unknown>): InviteRow {
  const appKey = String(row["app_key"] ?? "");
  const expiresAt = String(row["expires_at"] ?? "");
  let status = String(row["status"] ?? "pending") as InviteRow["status"];
  if (status === "pending" && expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    status = "expired";
  }
  return {
    id: String(row["id"]),
    appKey,
    appName: getFlexusApp(appKey)?.name ?? appKey,
    email: String(row["email"] ?? ""),
    status,
    note: (row["note"] as string | null) ?? null,
    createdAt: String(row["created_at"] ?? ""),
    expiresAt,
    acceptedAt: (row["accepted_at"] as string | null) ?? null,
  };
}

/** Convites da conta do titular. */
export async function listInvites(ownerUserId: string): Promise<InviteRow[]> {
  const supabase = await db();
  const { data } = await supabase
    .from("account_invites")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false })
    .limit(200);
  return ((data ?? []) as Record<string, unknown>[]).map(mapRow);
}

/** Vagas de um produto: limite do plano menos titular e convites em uso. */
export async function seatUsage(ownerUserId: string, appKey: string): Promise<SeatUsage> {
  const ent = await resolveUserEntitlements(ownerUserId, appKey);
  const raw = ent.limites["usuarios"];
  const limite = raw === null || raw === undefined ? null : Number(raw);

  const supabase = await db();
  const { data } = await supabase
    .from("account_invites")
    .select("id, status, expires_at")
    .eq("owner_user_id", ownerUserId)
    .eq("app_key", appKey)
    .in("status", ["pending", "accepted"]);

  const ativos = ((data ?? []) as Array<{ status: string; expires_at: string }>).filter(
    (r) => r.status === "accepted" || new Date(r.expires_at).getTime() > Date.now(),
  ).length;

  const usados = ativos + 1; // titular ocupa uma vaga
  return {
    appKey,
    appName: getFlexusApp(appKey)?.name ?? appKey,
    limite,
    usados,
    disponiveis: limite === null ? null : Math.max(0, limite - usados),
  };
}

export interface CreateInviteInput {
  ownerUserId: string;
  ownerEmail: string;
  appKey: string;
  email: string;
  note?: string;
  origin: string;
}

/** Cria o convite e dispara o e-mail. Nunca lança: devolve o erro tratado. */
export async function createInvite(
  input: CreateInviteInput,
): Promise<{ invite: InviteRow } | { error: string }> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "E-mail inválido." };
  if (email === input.ownerEmail.trim().toLowerCase()) {
    return { error: "Você já é o titular desta assinatura." };
  }

  const ent = await resolveUserEntitlements(input.ownerUserId, input.appKey);
  if (!ent.ativo) {
    return { error: "Você precisa de uma assinatura ativa deste sistema para convidar." };
  }

  const usage = await seatUsage(input.ownerUserId, input.appKey);
  if (usage.disponiveis !== null && usage.disponiveis <= 0) {
    return {
      error: `Seu plano permite ${usage.limite} usuário(s) e as vagas já estão ocupadas. Faça upgrade para convidar mais pessoas.`,
    };
  }

  const supabase = await db();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000).toISOString();
  const token = newToken();

  const { data, error } = await supabase
    .from("account_invites")
    .insert({
      owner_user_id: input.ownerUserId,
      owner_email: input.ownerEmail,
      app_key: input.appKey,
      email,
      token,
      note: input.note?.slice(0, 300) ?? null,
      expires_at: expiresAt,
    } as never)
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return { error: "Já existe um convite pendente para este e-mail." };
    return { error: error.message };
  }

  const app = getFlexusApp(input.appKey);
  const { enqueueEmail } = await import("@/lib/email-queue.server");
  await enqueueEmail({
    template: "convite-equipe",
    recipient: email,
    idempotencyKey: `invite:${String((data as Record<string, unknown>)["id"])}`,
    templateData: {
      produto: app?.name ?? input.appKey,
      titular: input.ownerEmail,
      nota: input.note ?? "",
      url: `${input.origin}/convite/${token}`,
      validade: `${INVITE_TTL_DAYS} dias`,
    },
    replyTo: input.ownerEmail,
  });

  return { invite: mapRow(data as Record<string, unknown>) };
}

/** Cancela um convite pendente do titular. */
export async function revokeInvite(
  ownerUserId: string,
  inviteId: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await db();
  const { error } = await supabase
    .from("account_invites")
    .update({ status: "revoked", revoked_at: new Date().toISOString() } as never)
    .eq("id", inviteId)
    .eq("owner_user_id", ownerUserId)
    .eq("status", "pending");
  if (error) return { error: error.message };
  return { ok: true };
}

export interface InvitePreview {
  appKey: string;
  appName: string;
  email: string;
  titular: string;
  status: InviteRow["status"];
}

/** Dados públicos do convite (para a tela de aceite). */
export async function inviteByToken(token: string): Promise<InvitePreview | null> {
  const supabase = await db();
  const { data } = await supabase
    .from("account_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const mapped = mapRow(row);
  return {
    appKey: mapped.appKey,
    appName: mapped.appName,
    email: mapped.email,
    titular: String(row["owner_email"] ?? ""),
    status: mapped.status,
  };
}

/** Aceita o convite e provisiona o acesso do convidado no sistema. */
export async function acceptInvite(
  token: string,
  userId: string,
  userEmail: string,
): Promise<{ ok: true; appKey: string; appName: string } | { error: string }> {
  const supabase = await db();
  const { data } = await supabase
    .from("account_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (!data) return { error: "Convite não encontrado." };

  const row = data as Record<string, unknown>;
  const mapped = mapRow(row);
  if (mapped.status === "accepted") {
    return { ok: true, appKey: mapped.appKey, appName: mapped.appName };
  }
  if (mapped.status !== "pending") return { error: "Este convite não está mais válido." };
  if (mapped.email !== userEmail.trim().toLowerCase()) {
    return { error: `Este convite foi enviado para ${mapped.email}. Entre com esse e-mail.` };
  }

  const { error } = await supabase
    .from("account_invites")
    .update({
      status: "accepted",
      accepted_user_id: userId,
      accepted_at: new Date().toISOString(),
    } as never)
    .eq("id", mapped.id)
    .eq("status", "pending");
  if (error) return { error: error.message };

  // Libera o acesso do convidado no sistema do titular.
  const ownerUserId = String(row["owner_user_id"] ?? "");
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("price_id, status, current_period_end, environment")
    .eq("user_id", ownerUserId)
    .order("created_at", { ascending: false });

  const { appKeyFromPriceId } = await import("@/lib/flexus-apps");
  const sub = ((subs ?? []) as Array<Record<string, string | null>>).find(
    (s) => appKeyFromPriceId(s["price_id"]) === mapped.appKey,
  );

  if (sub) {
    const { provisionApp } = await import("@/lib/provisioning.server");
    await provisionApp({
      event: "updated",
      userId,
      priceId: String(sub["price_id"]),
      status: String(sub["status"] ?? "active"),
      accessUntil: sub["current_period_end"] ?? null,
      environment: String(sub["environment"] ?? "live"),
      extra: { convidadoPor: ownerUserId, papel: "membro" },
    });
  }

  return { ok: true, appKey: mapped.appKey, appName: mapped.appName };
}
