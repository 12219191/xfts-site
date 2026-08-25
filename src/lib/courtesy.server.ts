/**
 * Assinaturas de cortesia (beta testers).
 *
 * São gravadas direto no hub, sem passar pelo provedor de pagamento: os IDs
 * usam o prefixo `comp_`, então todas as ações de cobrança continuam
 * bloqueadas pelos guards de assinatura simulada.
 */
import { createClient } from "@supabase/supabase-js";
import { provisionApp } from "@/lib/provisioning.server";

export const COURTESY_PREFIX = "comp_";

let _client: ReturnType<typeof createClient> | null = null;
export function courtesyDb() {
  if (!_client) {
    _client = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    );
  }
  return _client;
}

/** Localiza (ou convida) o titular pelo e-mail. */
export async function findOrInviteUser(
  email: string,
): Promise<{ userId: string; invited: boolean } | { error: string }> {
  const target = email.trim().toLowerCase();
  const db = courtesyDb();

  for (let page = 1; page <= 5; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return { error: error.message };
    const found = data.users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (found) return { userId: found.id, invited: false };
    if (data.users.length < 1000) break;
  }

  const { data: invite, error: inviteError } = await db.auth.admin.inviteUserByEmail(target);
  if (inviteError || !invite?.user) {
    return { error: inviteError?.message ?? "Não foi possível convidar este e-mail." };
  }
  return { userId: invite.user.id, invited: true };
}

export interface CourtesySweepResult {
  checked: number;
  expired: number;
}

/**
 * Encerra as cortesias vencidas: bloqueia o acesso no sistema do produto e
 * marca a assinatura como cancelada no hub.
 */
export async function expireCourtesyAccess(): Promise<CourtesySweepResult> {
  const db = courtesyDb();
  const nowIso = new Date().toISOString();

  const { data } = await db
    .from("subscriptions")
    .select("id, user_id, price_id, status, environment, current_period_end")
    .eq("is_courtesy", true)
    .in("status", ["active", "trialing"])
    .lte("current_period_end", nowIso);

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    user_id: string;
    price_id: string;
    environment: string;
    current_period_end: string | null;
  }>;

  let expired = 0;
  for (const row of rows) {
    await provisionApp({
      event: "canceled",
      userId: row.user_id,
      priceId: row.price_id,
      status: "canceled",
      accessUntil: row.current_period_end,
      environment: row.environment,
    });

    await db
      .from("subscriptions")
      .update({ status: "canceled", updated_at: nowIso } as never)
      .eq("id", row.id);

    await db.from("subscription_events").insert({
      user_id: row.user_id,
      stripe_subscription_id: null,
      event_type: "cortesia_expirada",
      price_id: row.price_id,
      reason: "prazo da cortesia encerrado",
      environment: row.environment,
    } as never);

    expired += 1;
  }

  return { checked: rows.length, expired };
}
