/**
 * Mock mínimo do cliente admin do banco, suficiente para os testes de
 * entitlements: definições de recursos, planos do catálogo e assinaturas.
 */
export interface MockPlan {
  name: string;
  tier: string;
  seats: number | null;
  price_lookup_key: string | null;
  annual_lookup_key: string | null;
  entitlements: Record<string, boolean | number | null>;
}

export interface MockSub {
  price_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end?: boolean | null;
  seats_used?: number | null;
  seats_override?: number | null;
  created_at?: string;
  environment?: string;
  is_courtesy?: boolean | null;
}

export interface MockDefinition {
  id: string;
  product_key: string;
  key: string;
  label: string;
  kind: "feature" | "limit";
  unit?: string | null;
  description?: string | null;
  sort_order?: number;
}

export interface MockState {
  definitions: MockDefinition[];
  plans: MockPlan[];
  subscriptions: MockSub[];
}

/** Tabelas que devolvem erro nas leituras em lista (simula falha transitória). */
export const failTables = new Set<string>();

export const state: MockState = { definitions: [], plans: [], subscriptions: [] };

export function setState(next: Partial<MockState>) {
  state.definitions = next.definitions ?? [];
  state.plans = next.plans ?? [];
  state.subscriptions = next.subscriptions ?? [];
}

interface Filter {
  column: string;
  value: unknown;
}

function makeQuery(table: string) {
  const filters: Filter[] = [];
  let orLookup: string | null = null;

  function rows(): unknown[] {
    if (table === "entitlement_definitions") {
      return state.definitions
        .filter((d) =>
          filters.every((f) => (f.column === "product_key" ? d.product_key === f.value : true)),
        )
        .map((d) => ({ unit: "", description: "", sort_order: 0, ...d }));
    }
    if (table === "catalog_plans") {
      return state.plans.filter(
        (p) =>
          !orLookup ||
          p.price_lookup_key === orLookup ||
          p.annual_lookup_key === orLookup,
      );
    }
    if (table === "subscriptions") {
      return state.subscriptions.filter((s) =>
        filters.every((f) =>
          f.column === "environment" ? (s.environment ?? "sandbox") === f.value : true,
        ),
      );
    }
    return [];
  }

  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => {
      filters.push({ column, value });
      return query;
    },
    or: (expr: string) => {
      // formato: price_lookup_key.eq.X,annual_lookup_key.eq.X
      orLookup = expr.split(".eq.")[1]?.split(",")[0] ?? null;
      return query;
    },
    order: () => query,
    limit: () => query,
    maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
    then: (resolve: (value: { data: unknown[] | null; error: { message: string } | null }) => unknown) =>
      failTables.has(table)
        ? resolve({ data: null, error: { message: "falha simulada" } })
        : resolve({ data: rows(), error: null }),
  };
  return query;
}

export const supabaseAdmin = {
  from: (table: string) => makeQuery(table),
};
