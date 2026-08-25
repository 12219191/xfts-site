import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ACTIVE_STATUSES, getFlexusApp } from "@/lib/flexus-apps";
import type { StripeEnv } from "@/lib/stripe.server";

export interface CourtesyRow {
  id: string;
  user_id: string;
  email: string | null;
  app_key: string;
  price_id: string;
  status: string;
  current_period_end: string | null;
  courtesy_note: string | null;
  environment: string;
  created_at: string | null;
}

type GrantInput = {
  email: string;
  appKey: string;
  tier: "basico" | "pro";
  dias: number;
  nota?: string;
  environment: StripeEnv;
};

async function assertAdmin(context: {
  supabase: { from: (t: string) => any };
  userId: string;
}) {
  const { data } = await context.supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", context.userId)
    .maybeSingle();
  if (!data) throw new Error("Acesso restrito a administradores.");
}

/** Lista as cortesias concedidas (ativas e encerradas). */
export const listCourtesy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ rows: CourtesyRow[] } | { error: string }> => {
    try {
      await assertAdmin(context as never);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Acesso negado" };
    }

    const { courtesyDb } = await import("@/lib/courtesy.server");
    const db = courtesyDb();

    const { data, error } = await db
      .from("subscriptions")
      .select(
        "id, user_id, product_id, price_id, status, current_period_end, courtesy_note, environment, created_at",
      )
      .eq("is_courtesy", true)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return { error: error.message };

    const rows = (data ?? []) as unknown as Array<Record<string, string | null>>;
    const emails = new Map<string, string | null>();
    for (const row of rows) {
      const userId = row["user_id"] as string;
      if (emails.has(userId)) continue;
      const { data: userData } = await db.auth.admin.getUserById(userId);
      emails.set(userId, userData?.user?.email ?? null);
    }

    return {
      rows: rows.map((row) => ({
        id: row["id"] as string,
        user_id: row["user_id"] as string,
        email: emails.get(row["user_id"] as string) ?? null,
        app_key: (row["product_id"] as string) ?? "",
        price_id: (row["price_id"] as string) ?? "",
        status: (row["status"] as string) ?? "",
        current_period_end: row["current_period_end"] ?? null,
        courtesy_note: row["courtesy_note"] ?? null,
        environment: (row["environment"] as string) ?? "sandbox",
        created_at: row["created_at"] ?? null,
      })),
    };
  });

/** Concede acesso de cortesia por um período determinado. */
export const grantCourtesy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: GrantInput) => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email ?? "")) throw new Error("E-mail inválido");
    if (!["basico", "pro"].includes(data.tier)) throw new Error("Plano inválido");
    if (!Number.isFinite(data.dias) || data.dias < 1 || data.dias > 365) {
      throw new Error("Informe uma validade entre 1 e 365 dias");
    }
    return data;
  })
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: true; message: string; invited: boolean } | { error: string }> => {
      try {
        await assertAdmin(context as never);
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Acesso negado" };
      }

      const app = getFlexusApp(data.appKey);
      if (!app) return { error: "Sistema inválido" };

      const priceId = `${app.pricePrefix}_${data.tier}_mensal`;
      const { courtesyDb, findOrInviteUser, COURTESY_PREFIX } = await import(
        "@/lib/courtesy.server"
      );
      const { provisionApp } = await import("@/lib/provisioning.server");

      const user = await findOrInviteUser(data.email);
      if ("error" in user) return { error: user.error };

      const db = courtesyDb();

      const { data: existing } = await db
        .from("subscriptions")
        .select("id, price_id, status, current_period_end")
        .eq("user_id", user.userId)
        .eq("environment", data.environment);

      const clash = ((existing ?? []) as unknown as Array<Record<string, string>>).find(
        (row) =>
          (row["price_id"] ?? "").startsWith(app.pricePrefix) &&
          ACTIVE_STATUSES.includes(row["status"] ?? "") &&
          (!row["current_period_end"] ||
            new Date(row["current_period_end"]!).getTime() > Date.now()),
      );
      if (clash) {
        return {
          error: `Este e-mail já tem acesso ativo ao ${app.name}. Encerre o acesso atual antes de conceder outro.`,
        };
      }

      const now = new Date();
      const until = new Date(now.getTime() + data.dias * 24 * 60 * 60 * 1000);

      const { error: insertError } = await db.from("subscriptions").insert({
        user_id: user.userId,
        stripe_subscription_id: `${COURTESY_PREFIX}${crypto.randomUUID()}`,
        stripe_customer_id: `${COURTESY_PREFIX}${user.userId.slice(0, 8)}`,
        product_id: app.key,
        price_id: priceId,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: until.toISOString(),
        cancel_at_period_end: false,
        environment: data.environment,
        is_courtesy: true,
        courtesy_note: data.nota?.slice(0, 300) ?? null,
        granted_by: context.userId,
      } as never);
      if (insertError) return { error: insertError.message };

      const provision = await provisionApp({
        event: "created",
        userId: user.userId,
        priceId,
        status: "active",
        accessUntil: until.toISOString(),
        environment: data.environment,
      });

      await db.from("subscription_events").insert({
        user_id: user.userId,
        stripe_subscription_id: null,
        event_type: "cortesia_concedida",
        price_id: priceId,
        reason: `validade de ${data.dias} dias${provision.ok ? "" : ` (provisionamento: ${provision.error})`}`,
        environment: data.environment,
      } as never);

      return {
        ok: true,
        invited: user.invited,
        message: `Cortesia liberada até ${until.toLocaleDateString("pt-BR")}${
          user.invited ? " — convite de acesso enviado por e-mail." : "."
        }${provision.ok ? "" : ` Atenção: o sistema não confirmou o provisionamento (${provision.error}).`}`,
      };
    },
  );

/** Encerra uma cortesia imediatamente. */
export const revokeCourtesy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    try {
      await assertAdmin(context as never);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Acesso negado" };
    }

    const { courtesyDb } = await import("@/lib/courtesy.server");
    const { provisionApp } = await import("@/lib/provisioning.server");
    const db = courtesyDb();

    const { data: row } = await db
      .from("subscriptions")
      .select("id, user_id, price_id, environment")
      .eq("id", data.id)
      .eq("is_courtesy", true)
      .maybeSingle();
    if (!row) return { error: "Cortesia não encontrada" };

    const record = row as unknown as {
      user_id: string;
      price_id: string;
      environment: string;
    };
    const nowIso = new Date().toISOString();

    await provisionApp({
      event: "canceled",
      userId: record.user_id,
      priceId: record.price_id,
      status: "canceled",
      accessUntil: nowIso,
      environment: record.environment,
    });

    await db
      .from("subscriptions")
      .update({ status: "canceled", current_period_end: nowIso, updated_at: nowIso } as never)
      .eq("id", data.id);

    await db.from("subscription_events").insert({
      user_id: record.user_id,
      stripe_subscription_id: null,
      event_type: "cortesia_encerrada",
      price_id: record.price_id,
      reason: "encerrada manualmente no admin",
      environment: record.environment,
    } as never);

    return { ok: true };
  });
