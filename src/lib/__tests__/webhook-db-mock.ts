/**
 * Banco em memória compartilhado pelos testes integrados do webhook do Stripe.
 * Serve tanto o cliente de serviço usado pelo webhook (createClient) quanto o
 * supabaseAdmin usado pela resolução de entitlements, garantindo que o estado
 * gravado por um evento seja o mesmo lido na verificação de acesso.
 */
export interface Row {
  [key: string]: unknown;
}

export interface DbState {
  subscriptions: Row[];
  subscription_events: Row[];
  webhook_events: Row[];
  catalog_plans: Row[];
  entitlement_definitions: Row[];
}

export const db: DbState = {
  subscriptions: [],
  subscription_events: [],
  webhook_events: [],
  catalog_plans: [],
  entitlement_definitions: [],
};

export function resetDb(seed: Partial<DbState> = {}) {
  db.subscriptions = seed.subscriptions ?? [];
  db.subscription_events = seed.subscription_events ?? [];
  db.webhook_events = seed.webhook_events ?? [];
  db.catalog_plans = seed.catalog_plans ?? [];
  db.entitlement_definitions = seed.entitlement_definitions ?? [];
}

function table(name: string): Row[] {
  const rows = (db as unknown as Record<string, Row[]>)[name];
  if (!rows) (db as unknown as Record<string, Row[]>)[name] = [];
  return (db as unknown as Record<string, Row[]>)[name]!;
}

function makeQuery(name: string) {
  const filters: Array<[string, unknown]> = [];
  let orLookup: string | null = null;
  let pendingUpdate: Row | null = null;
  let limitCount: number | null = null;

  function matches(row: Row): boolean {
    if (orLookup) {
      if (row["price_lookup_key"] !== orLookup && row["annual_lookup_key"] !== orLookup) {
        return false;
      }
    }
    return filters.every(([column, value]) => row[column] === value);
  }

  function rows(): Row[] {
    const out = table(name).filter(matches);
    return limitCount == null ? out : out.slice(0, limitCount);
  }

  function applyUpdate() {
    if (!pendingUpdate) return;
    for (const row of table(name).filter(matches)) Object.assign(row, pendingUpdate);
    pendingUpdate = null;
  }

  const result = { data: null, error: null };

  const query: any = {
    select: () => query,
    eq: (column: string, value: unknown) => {
      filters.push([column, value]);
      return query;
    },
    or: (expr: string) => {
      orLookup = expr.split(".eq.")[1]?.split(",")[0] ?? null;
      return query;
    },
    order: () => query,
    limit: (n: number) => {
      limitCount = n;
      return query;
    },
    insert: (row: Row | Row[]) => {
      for (const r of Array.isArray(row) ? row : [row]) table(name).push({ ...r });
      return Promise.resolve(result);
    },
    update: (row: Row) => {
      pendingUpdate = row;
      return query;
    },
    upsert: (row: Row | Row[], options?: { onConflict?: string }) => {
      const key = options?.onConflict;
      for (const r of Array.isArray(row) ? row : [row]) {
        const existing = key
          ? table(name).find((existingRow) => existingRow[key] === r[key])
          : undefined;
        if (existing) Object.assign(existing, r);
        else table(name).push({ ...r });
      }
      return Promise.resolve(result);
    },
    maybeSingle: async () => {
      applyUpdate();
      return { data: rows()[0] ?? null, error: null };
    },
    single: async () => {
      applyUpdate();
      return { data: rows()[0] ?? null, error: null };
    },
    then: (resolve: (value: { data: Row[]; error: null }) => unknown) => {
      applyUpdate();
      return resolve({ data: rows(), error: null });
    },
  };
  return query;
}

export const mockClient = {
  from: (name: string) => makeQuery(name),
  auth: { admin: { getUserById: async () => ({ data: { user: null } }) } },
};

export const createClient = () => mockClient;
export const supabaseAdmin = mockClient;
