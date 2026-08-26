/** Timeline unificada do cliente e notas internas (server-only). */
import { appKeyFromPriceId, getFlexusApp, planTierFromPriceId } from "@/lib/flexus-apps";
import { createStripeClient, type StripeEnv } from "@/lib/stripe.server";

export type TimelineKind =
  | "assinatura"
  | "fatura"
  | "cobranca"
  | "email"
  | "acesso"
  | "lead"
  | "admin"
  | "nota";

export interface TimelineItem {
  id: string;
  kind: TimelineKind;
  at: string;
  title: string;
  detail: string;
  status: "ok" | "atencao" | "erro" | "neutro";
  link?: string | null;
}

export interface CustomerNote {
  id: string;
  body: string;
  kind: string;
  pinned: boolean;
  authorEmail: string | null;
  createdAt: string;
}

export interface CustomerTimeline {
  items: TimelineItem[];
  notes: CustomerNote[];
}

const iso = (v: string | null | undefined) => v ?? new Date(0).toISOString();

function appLabel(priceId: string | null | undefined): string {
  const key = appKeyFromPriceId(priceId);
  return (key && getFlexusApp(key)?.name) || "FLEXUS";
}

function moneyBrl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const SUBSCRIPTION_EVENT_LABELS: Record<string, string> = {
  created: "Assinatura criada",
  activated: "Assinatura ativada",
  updated: "Assinatura atualizada",
  plan_changed: "Plano alterado",
  upgraded: "Upgrade de plano",
  downgraded: "Downgrade de plano",
  canceled: "Cancelamento",
  cancel_scheduled: "Cancelamento agendado",
  reactivated: "Assinatura reativada",
  payment_failed: "Falha de pagamento",
  payment_succeeded: "Pagamento confirmado",
};

async function stripeInvoices(
  customerIds: string[],
  environment: StripeEnv,
): Promise<TimelineItem[]> {
  if (customerIds.length === 0) return [];
  const out: TimelineItem[] = [];
  try {
    const stripe = createStripeClient(environment);
    for (const customer of customerIds.slice(0, 3)) {
      const list = await stripe.invoices.list({ customer, limit: 20 });
      for (const inv of list.data) {
        const paid = inv.status === "paid";
        out.push({
          id: `inv_${inv.id}`,
          kind: "fatura",
          at: new Date((inv.created ?? 0) * 1000).toISOString(),
          title: paid ? "Fatura paga" : `Fatura ${inv.status ?? "aberta"}`,
          detail: `${moneyBrl(inv.amount_due ?? 0)} · ${(inv.currency ?? "brl").toUpperCase()}`,
          status: paid ? "ok" : inv.status === "void" || inv.status === "uncollectible" ? "erro" : "atencao",
          link: inv.hosted_invoice_url ?? null,
        });
      }
    }
  } catch {
    // Stripe indisponível não deve quebrar a timeline
  }
  return out;
}

export async function buildCustomerTimeline(params: {
  userId: string;
  email: string;
  environment: string;
}): Promise<CustomerTimeline> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { userId, email, environment } = params;

  const [
    subs,
    events,
    dunning,
    emails,
    integrations,
    leads,
    audits,
    notesRes,
  ] = await Promise.all([
    supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id, price_id, status, created_at")
      .eq("user_id", userId)
      .eq("environment", environment),
    supabaseAdmin
      .from("subscription_events")
      .select("id, event_type, price_id, reason, created_at")
      .eq("user_id", userId)
      .eq("environment", environment)
      .order("created_at", { ascending: false })
      .limit(80),
    supabaseAdmin
      .from("dunning_emails")
      .select("id, stage, status, error, created_at")
      .eq("user_id", userId)
      .eq("environment", environment)
      .order("created_at", { ascending: false })
      .limit(30),
    email
      ? supabaseAdmin
          .from("email_queue")
          .select("id, template, status, last_error, created_at, sent_at")
          .eq("recipient", email)
          .order("created_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] as never[] }),
    supabaseAdmin
      .from("integration_events")
      .select("id, app_key, kind, status, reason, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(40),
    email
      ? supabaseAdmin
          .from("form_submissions")
          .select("id, reference_id, form_type, tela, status, crm_status, created_at")
          .eq("email", email)
          .order("created_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] as never[] }),
    supabaseAdmin
      .from("admin_audit_log")
      .select("id, action, actor_email, reason, created_at")
      .eq("target_id", userId)
      .order("created_at", { ascending: false })
      .limit(40),
    supabaseAdmin
      .from("customer_notes")
      .select("id, body, kind, pinned, author_email, created_at")
      .eq("customer_user_id", userId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const items: TimelineItem[] = [];

  for (const e of events.data ?? []) {
    items.push({
      id: `evt_${e.id}`,
      kind: "assinatura",
      at: iso(e.created_at),
      title: SUBSCRIPTION_EVENT_LABELS[e.event_type] ?? e.event_type,
      detail: [appLabel(e.price_id), e.price_id ? planTierFromPriceId(e.price_id) : null, e.reason]
        .filter(Boolean)
        .join(" · "),
      status: /fail|cancel/i.test(e.event_type) ? "atencao" : "ok",
    });
  }

  for (const d of dunning.data ?? []) {
    items.push({
      id: `dun_${d.id}`,
      kind: "cobranca",
      at: iso(d.created_at),
      title: `Aviso de cobrança D+${d.stage}`,
      detail: d.error ? `Falha: ${d.error}` : `Status: ${d.status}`,
      status: d.status === "sent" ? "ok" : d.error ? "erro" : "atencao",
    });
  }

  for (const m of (emails.data ?? []) as Array<{
    id: string;
    template: string;
    status: string;
    last_error: string | null;
    created_at: string;
    sent_at: string | null;
  }>) {
    items.push({
      id: `mail_${m.id}`,
      kind: "email",
      at: iso(m.sent_at ?? m.created_at),
      title: `E-mail · ${m.template}`,
      detail: m.last_error ? `Erro: ${m.last_error}` : `Status: ${m.status}`,
      status: m.status === "sent" ? "ok" : m.status === "failed" ? "erro" : "neutro",
    });
  }

  for (const i of integrations.data ?? []) {
    items.push({
      id: `int_${i.id}`,
      kind: "acesso",
      at: iso(i.created_at),
      title: `${getFlexusApp(i.app_key)?.name ?? i.app_key} · ${i.kind}`,
      detail: i.reason ?? `Status: ${i.status}`,
      status: i.status === "ok" ? "ok" : i.status === "denied" ? "atencao" : "erro",
    });
  }

  for (const l of (leads.data ?? []) as Array<{
    id: string;
    reference_id: string;
    form_type: string;
    tela: string;
    status: string;
    crm_status: string;
    created_at: string;
  }>) {
    items.push({
      id: `lead_${l.id}`,
      kind: "lead",
      at: iso(l.created_at),
      title: `Formulário ${l.form_type} · ${l.reference_id}`,
      detail: `${l.tela} · envio ${l.status} · CRM ${l.crm_status}`,
      status: l.status === "ok" ? "ok" : "atencao",
    });
  }

  for (const a of audits.data ?? []) {
    items.push({
      id: `aud_${a.id}`,
      kind: "admin",
      at: iso(a.created_at),
      title: `Ação interna · ${a.action}`,
      detail: [a.actor_email, a.reason].filter(Boolean).join(" · "),
      status: "neutro",
    });
  }

  const customerIds = [
    ...new Set((subs.data ?? []).map((s) => s.stripe_customer_id).filter(Boolean)),
  ] as string[];
  items.push(...(await stripeInvoices(customerIds, environment as StripeEnv)));

  items.sort((a, b) => (a.at < b.at ? 1 : -1));

  const notes: CustomerNote[] = ((notesRes.data ?? []) as Array<{
    id: string;
    body: string;
    kind: string;
    pinned: boolean;
    author_email: string | null;
    created_at: string;
  }>).map((n) => ({
    id: n.id,
    body: n.body,
    kind: n.kind,
    pinned: n.pinned,
    authorEmail: n.author_email,
    createdAt: n.created_at,
  }));

  return { items: items.slice(0, 300), notes };
}

export async function addCustomerNote(input: {
  customerUserId: string;
  customerEmail: string;
  body: string;
  kind: string;
  pinned: boolean;
  authorId: string;
  authorEmail: string;
}): Promise<{ ok: true } | { error: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("customer_notes").insert({
    customer_user_id: input.customerUserId,
    customer_email: input.customerEmail,
    body: input.body,
    kind: input.kind,
    pinned: input.pinned,
    author_id: input.authorId,
    author_email: input.authorEmail,
  } as never);
  return error ? { error: error.message } : { ok: true };
}

export async function removeCustomerNote(id: string): Promise<{ ok: true } | { error: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("customer_notes").delete().eq("id", id);
  return error ? { error: error.message } : { ok: true };
}
