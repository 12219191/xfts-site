import { beforeEach, describe, expect, it, vi } from "vitest";

interface EmailRow {
  id: string;
  template: string;
  recipient: string;
  template_data: Record<string, unknown>;
  idempotency_key: string;
  reply_to: string | null;
  status: string;
  attempts: number;
  next_attempt_at: string;
  last_error: string | null;
  sent_at: string | null;
  discard_reason: string | null;
  environment: string;
  created_at: string;
}

const queue: EmailRow[] = [];
/** Resultados encadeados do envio: sucesso, supressão ou erro. */
const sendResults: Array<{ sent: boolean } | Error> = [];
let sendCalls = 0;

function makeQuery(table: string) {
  const filters: Array<{ col: string; value: unknown }> = [];
  let update: Record<string, unknown> | null = null;
  let dueBefore: string | null = null;

  const rows = () =>
    queue.filter((r) => {
      if (table !== "email_queue") return false;
      if (dueBefore && r.next_attempt_at > dueBefore) return false;
      return filters.every((f) => (r as unknown as Record<string, unknown>)[f.col] === f.value);
    });

  const api: Record<string, unknown> = {
    select: () => api,
    eq: (col: string, value: unknown) => {
      filters.push({ col, value });
      return api;
    },
    gte: () => api,
    lte: (_col: string, value: string) => {
      dueBefore = value;
      return api;
    },
    order: () => api,
    limit: () => Promise.resolve({ data: rows() }),
    maybeSingle: () => Promise.resolve({ data: rows()[0] ?? null, error: null }),
    update: (values: Record<string, unknown>) => {
      update = values;
      return api;
    },
    insert: (values: Record<string, unknown>) => {
      const row = {
        ...(values as unknown as EmailRow),
        id: `e${queue.length + 1}`,
        created_at: new Date().toISOString(),
        sent_at: null,
        last_error: null,
        discard_reason: null,
      } as EmailRow;
      queue.push(row);
      const inserted: Record<string, unknown> = {
        select: () => inserted,
        maybeSingle: () => Promise.resolve({ data: row, error: null }),
      };
      return inserted;
    },
    then: (resolve: (v: unknown) => unknown) => {
      if (update) for (const r of rows()) Object.assign(r, update);
      return Promise.resolve({ data: rows(), error: null }).then(resolve);
    },
  };
  return api;
}

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: (table: string) => makeQuery(table) },
}));

vi.mock("@/lib/email-templates/send-email", () => ({
  sendTemplateEmail: async () => {
    sendCalls += 1;
    const next = sendResults.shift() ?? { sent: true };
    if (next instanceof Error) throw next;
    return next;
  },
}));

const { enqueueEmail, flushEmailQueue, EMAIL_MAX_ATTEMPTS } = await import(
  "@/lib/email-queue.server"
);

beforeEach(() => {
  queue.length = 0;
  sendResults.length = 0;
  sendCalls = 0;
});

describe("fila de e-mails", () => {
  it("envia na hora quando o serviço responde", async () => {
    const result = await enqueueEmail({
      template: "pagamento-falhou",
      recipient: "cliente@exemplo.com",
      idempotencyKey: "dunning-sub_1-1",
    });

    expect(result.status).toBe("sent");
    expect(result.duplicate).toBe(false);
    expect(queue[0]!.status).toBe("sent");
  });

  it("não envia duas vezes o mesmo aviso (idempotência)", async () => {
    await enqueueEmail({
      template: "pagamento-falhou",
      recipient: "cliente@exemplo.com",
      idempotencyKey: "dunning-sub_1-1",
    });
    const again = await enqueueEmail({
      template: "pagamento-falhou",
      recipient: "cliente@exemplo.com",
      idempotencyKey: "dunning-sub_1-1",
    });

    expect(again.duplicate).toBe(true);
    expect(sendCalls).toBe(1);
    expect(queue).toHaveLength(1);
  });

  it("agenda nova tentativa quando o envio falha", async () => {
    sendResults.push(new Error("serviço indisponível"));

    const result = await enqueueEmail({
      template: "pagamento-falhou",
      recipient: "cliente@exemplo.com",
      idempotencyKey: "dunning-sub_2-1",
    });

    expect(result.status).toBe("pending");
    expect(queue[0]!.attempts).toBe(1);
    expect(queue[0]!.last_error).toContain("serviço indisponível");
    expect(new Date(queue[0]!.next_attempt_at).getTime()).toBeGreaterThan(Date.now());
  });

  it("entrega na varredura seguinte quando o serviço volta", async () => {
    sendResults.push(new Error("timeout"));
    await enqueueEmail({
      template: "pagamento-falhou",
      recipient: "cliente@exemplo.com",
      idempotencyKey: "dunning-sub_3-1",
    });

    // a espera vence
    queue[0]!.next_attempt_at = new Date(Date.now() - 1000).toISOString();

    const flush = await flushEmailQueue();
    expect(flush.enviados).toBe(1);
    expect(queue[0]!.status).toBe("sent");
    expect(queue[0]!.attempts).toBe(2);
  });

  it("respeita a espera: nada é reenviado antes da hora", async () => {
    sendResults.push(new Error("timeout"));
    await enqueueEmail({
      template: "pagamento-falhou",
      recipient: "cliente@exemplo.com",
      idempotencyKey: "dunning-sub_4-1",
    });

    const flush = await flushEmailQueue();
    expect(flush.processados).toBe(0);
    expect(queue[0]!.status).toBe("pending");
  });

  it("marca como esgotado após o limite de tentativas", async () => {
    for (let i = 0; i < EMAIL_MAX_ATTEMPTS; i += 1) sendResults.push(new Error("falha"));

    await enqueueEmail({
      template: "pagamento-falhou",
      recipient: "cliente@exemplo.com",
      idempotencyKey: "dunning-sub_5-1",
    });

    for (let i = 1; i < EMAIL_MAX_ATTEMPTS; i += 1) {
      queue[0]!.next_attempt_at = new Date(Date.now() - 1000).toISOString();
      await flushEmailQueue();
    }

    expect(queue[0]!.attempts).toBe(EMAIL_MAX_ATTEMPTS);
    expect(queue[0]!.status).toBe("failed");
  });

  it("registra destinatário bloqueado sem tentar de novo", async () => {
    sendResults.push({ sent: false });

    const result = await enqueueEmail({
      template: "pagamento-falhou",
      recipient: "bloqueado@exemplo.com",
      idempotencyKey: "dunning-sub_6-1",
    });

    expect(result.status).toBe("suppressed");
    queue[0]!.next_attempt_at = new Date(Date.now() - 1000).toISOString();
    const flush = await flushEmailQueue();
    expect(flush.processados).toBe(0);
  });
});
