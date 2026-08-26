import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { InvitePreview, InviteRow, SeatUsage } from "@/lib/invites.server";

export type { InvitePreview, InviteRow, SeatUsage };

export interface TeamOverview {
  invites: InviteRow[];
  seats: SeatUsage[];
}

/** Convites e vagas por sistema contratado pelo titular logado. */
export const getTeamOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TeamOverview> => {
    const { listInvites, seatUsage } = await import("@/lib/invites.server");
    const { appKeyFromPriceId, ACTIVE_STATUSES } = await import("@/lib/flexus-apps");

    const { data: subs } = await context.supabase
      .from("subscriptions")
      .select("price_id, status, current_period_end")
      .eq("user_id", context.userId);

    const keys = new Set<string>();
    for (const sub of subs ?? []) {
      if (!ACTIVE_STATUSES.includes(sub.status)) continue;
      const key = appKeyFromPriceId(sub.price_id);
      if (key) keys.add(key);
    }

    const [invites, seats] = await Promise.all([
      listInvites(context.userId),
      Promise.all([...keys].map((key) => seatUsage(context.userId, key))),
    ]);

    return { invites, seats };
  });

/** Convida alguém para usar um sistema contratado pelo titular. */
export const inviteTeammate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appKey: string; email: string; note?: string; origin: string }) => {
    if (!data.appKey) throw new Error("Selecione o sistema.");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ invite: InviteRow } | { error: string }> => {
    const { createInvite } = await import("@/lib/invites.server");
    return createInvite({
      ownerUserId: context.userId,
      ownerEmail: (context.claims as { email?: string })?.email ?? "",
      appKey: data.appKey,
      email: data.email,
      ...(data.note ? { note: data.note } : {}),
      origin: data.origin,
    });
  });

/** Cancela um convite pendente. */
export const cancelInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { revokeInvite } = await import("@/lib/invites.server");
    return revokeInvite(context.userId, data.id);
  });

/** Dados do convite para a tela pública de aceite. */
export const previewInvite = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => {
    if (!/^[a-f0-9]{10,64}$/.test(data.token ?? "")) throw new Error("Convite inválido");
    return data;
  })
  .handler(async ({ data }): Promise<InvitePreview | null> => {
    const { inviteByToken } = await import("@/lib/invites.server");
    return inviteByToken(data.token);
  });

/** Aceita o convite com a conta logada. */
export const acceptTeamInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { token: string }) => {
    if (!/^[a-f0-9]{10,64}$/.test(data.token ?? "")) throw new Error("Convite inválido");
    return data;
  })
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: true; appKey: string; appName: string } | { error: string }> => {
      const { acceptInvite } = await import("@/lib/invites.server");
      return acceptInvite(
        data.token,
        context.userId,
        (context.claims as { email?: string })?.email ?? "",
      );
    },
  );
