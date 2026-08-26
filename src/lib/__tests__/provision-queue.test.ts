import { beforeEach, describe, expect, it, vi } from "vitest";

interface QueueRow {
  id: string;
  app_key: string;
  event: string;
  status: string;
  attempts: number;
  last_error: string | null;
  next_attempt_at: string;
  delivered_at?: string | null;
  payload: Record<string, unknown>;
}

const queue: QueueRow[] = [];
const provisionResults: Array<{ ok: boolean; error?: string }> = [];

function makeQuery(table: string) {
  const filters: Array<{ col: string; value: unknown }> = [];
  let update: Record<string, unknown> | null = null;
  let statusFilter: string | null = null;
  let dueBefore: string | null = null;

  const rows = () =>
    queue.filter((r) => {
      if (table !== "provision_queue") return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (dueBefore && r.next_attempt_at > dueBefore) return false;
      return filters.every((f) => (r as unknown as Record<string, unknown>)[f.col] === f.value);
    });

  const api: Record<string, unknown> = {
    select: () => api,
    eq: (col: string, value: unknown) => {
      if (col === "status") statusFilter = value as string;
      else filters.push({ col, value });
      return api;
    },
    lte: (_col: string, value: string) => {
      dueBefore = value;
      return api;
    },
    order: () => api,
    limit: () => Promise.resolve({ data: rows() }),
    maybeSingle: () => Promise.resolve({ data: rows()[0] ?? null }),
    update: (values: Record<string, unknown>) => {
      update = values;
      return api;
    },
    insert: (values: Record<string, unknown>) => {
      queue.push({ ...(values as unknown as QueueRow), id: `q${queue.length + 1}` });
      return Promise.resolve({ error: null });
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

vi.mock("@/lib/provisioning.server", () => ({
  provisionApp: vi.fn(async () => provisionResults.shift() ?? { ok: false, error: "falha" }),
}));

const payload = {
  priceId: "flexus_casa360_pro",
  userId: "11111111-1111-1111-1111-111111111111",
  event: "created" as const,
  status: "active",
  accessUntil: null,
  environment: "live",
};

function seed(row: Partial<QueueRow> = {}) {
  queue.length = 0;
  queue.push({
    id: "q1",
    app_key: "casa360",
    event: "created",
    status: "pending",
    attempts: 1,
    last_error: "HTTP 500",
    next_attempt_at: new Date(Date.now() - 60_000).toISOString(),
    payload,
    ...row,
  });
}

describe("fila de provisionamento", () => {
  beforeEach(() => {
    provisionResults.length = 0;
    seed();
  });

  it("marca como entregue quando o reenvio dá certo", async () => {
    provisionResults.push({ ok: true });
    const { retryProvisionQueue } = await import("@/lib/reliability.server");
    const result = await retryProvisionQueue();
    expect(result.entregues).toBe(1);
    expect(queue[0]!.status).toBe("delivered");
    expect(queue[0]!.attempts).toBe(2);
  });

  it("reagenda com espera crescente quando falha de novo", async () => {
    provisionResults.push({ ok: false, error: "HTTP 502" });
    const { retryProvisionQueue, PROVISION_BACKOFF_MINUTES } = await import(
      "@/lib/reliability.server"
    );
    const before = Date.now();
    const result = await retryProvisionQueue();
    expect(result.reagendados).toBe(1);
    expect(queue[0]!.status).toBe("pending");
    expect(queue[0]!.attempts).toBe(2);
    expect(queue[0]!.last_error).toBe("HTTP 502");
    const delta = new Date(queue[0]!.next_attempt_at).getTime() - before;
    expect(delta).toBeGreaterThan((PROVISION_BACKOFF_MINUTES[1]! - 1) * 60_000);
  });

  it("esgota após o número máximo de tentativas", async () => {
    seed({ attempts: 5 });
    provisionResults.push({ ok: false, error: "HTTP 500" });
    const { retryProvisionQueue, PROVISION_MAX_ATTEMPTS } = await import(
      "@/lib/reliability.server"
    );
    const result = await retryProvisionQueue();
    expect(result.esgotados).toBe(1);
    expect(queue[0]!.status).toBe("failed");
    expect(queue[0]!.attempts).toBe(PROVISION_MAX_ATTEMPTS);
  });

  it("não processa itens cuja espera ainda não venceu", async () => {
    seed({ next_attempt_at: new Date(Date.now() + 10 * 60_000).toISOString() });
    const { retryProvisionQueue } = await import("@/lib/reliability.server");
    const result = await retryProvisionQueue();
    expect(result.processados).toBe(0);
    expect(queue[0]!.status).toBe("pending");
  });

  it("reenvio manual entrega e limpa o erro", async () => {
    provisionResults.push({ ok: true });
    const { retryProvisionItem } = await import("@/lib/reliability.server");
    const result = await retryProvisionItem("q1");
    expect(result.ok).toBe(true);
    expect(queue[0]!.status).toBe("delivered");
    expect(queue[0]!.last_error).toBeNull();
  });

  it("descarte marca o item como descartado", async () => {
    const { discardProvisionItem } = await import("@/lib/reliability.server");
    await discardProvisionItem("q1");
    expect(queue[0]!.status).toBe("discarded");
  });
});
