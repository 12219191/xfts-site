import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getAdminCatalog } from "@/lib/admin-catalog.functions";
import { getCapabilities } from "@/lib/admin-capabilities.functions";
import type { CatalogProduct } from "@/lib/catalog";
import { SCOPE_LABELS, type Capability } from "@/lib/capabilities";

interface ScreenRow {
  route: string;
  reports: string[];
  capability: Capability;
}

/** Mapa das telas reais de cada SaaS: rota → capability → entitlement exigido. */
export function CapabilityScreensPanel() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [caps, setCaps] = useState<Capability[]>([]);
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catalog, capabilities] = await Promise.all([
        getAdminCatalog(),
        getCapabilities({ data: {} }),
      ]);
      setProducts(catalog.products);
      setCaps(capabilities);
      setSelected((current) => current || catalog.products[0]?.key || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar o mapa de telas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const productCaps = useMemo(
    () => caps.filter((c) => c.productKey === selected),
    [caps, selected],
  );

  const rows = useMemo<ScreenRow[]>(() => {
    const list: ScreenRow[] = [];
    for (const cap of productCaps) {
      const routes = cap.resources.filter((r) => r.resourceType === "UI_ROUTE");
      const reports = cap.resources
        .filter((r) => r.resourceType === "REPORT")
        .map((r) => r.resourceKey);
      for (const route of routes) {
        list.push({ route: route.resourceKey, reports, capability: cap });
      }
    }
    return list.sort((a, b) => a.route.localeCompare(b.route));
  }, [productCaps]);

  const missing = useMemo(
    () => productCaps.filter((cap) => !cap.resources.some((r) => r.resourceType === "UI_ROUTE")),
    [productCaps],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (row) =>
        row.route.toLowerCase().includes(term) ||
        row.capability.key.toLowerCase().includes(term) ||
        (row.capability.requiredEntitlementKey ?? "").toLowerCase().includes(term),
    );
  }, [rows, search]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando telas…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {products.map((product) => (
          <Button
            key={product.key}
            size="sm"
            variant={product.key === selected ? "default" : "outline"}
            onClick={() => setSelected(product.key)}
          >
            {product.name}
          </Button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Telas do sistema</h3>
            <p className="text-sm text-muted-foreground">
              Cada tela protegida do SaaS, a capability que a libera e o entitlement exigido no
              plano. Ajuste em Capabilities.
            </p>
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tela, capability ou entitlement"
            className="w-full sm:w-72"
          />
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-4">Tela</th>
                <th className="py-2 pr-4">Capability</th>
                <th className="py-2 pr-4">Entitlement</th>
                <th className="py-2 pr-4">Relatórios</th>
                <th className="py-2 pr-4">Escopo</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={`${row.capability.id}-${row.route}`} className="border-b border-border/60">
                  <td className="py-2 pr-4 font-mono text-xs text-foreground">{row.route}</td>
                  <td className="py-2 pr-4">
                    <span className="font-medium text-foreground">{row.capability.name}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {row.capability.key}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    {row.capability.requiredEntitlementKey ? (
                      <Badge variant="secondary">{row.capability.requiredEntitlementKey}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Incluído em todos</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                    {row.reports.join(", ") || "—"}
                  </td>
                  <td className="py-2 pr-4 text-xs text-muted-foreground">
                    {SCOPE_LABELS[row.capability.visibilityScope]}
                  </td>
                  <td className="py-2">
                    <Badge variant={row.capability.enabled ? "default" : "outline"}>
                      {row.capability.enabled ? "Ativa" : "Inativa"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    Nenhuma tela cadastrada para este sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {missing.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Capabilities sem tela vinculada ({missing.length})
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre um recurso do tipo UI_ROUTE para que o SaaS possa bloquear a tela.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {missing.map((cap) => (
              <Badge key={cap.id} variant="outline" className="font-mono text-xs">
                {cap.key}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
