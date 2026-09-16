import { useCallback, useEffect, useState } from "react";
import { getMyEntitlements, type UserEntitlements } from "@/lib/entitlements.functions";
import { hasFeature, limitOf, withinLimit } from "@/lib/entitlements";
import { makeCan } from "@/lib/capabilities";

/**
 * Entitlements do usuário logado, resolvidos no servidor.
 * Enquanto carrega, tudo fica bloqueado (fail-closed).
 */
export function useEntitlements() {
  const [data, setData] = useState<UserEntitlements[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setData(await getMyEntitlements());
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const forProduct = useCallback(
    (productKey: string) => data.find((e) => e.productKey === productKey) ?? null,
    [data],
  );

  return {
    entitlements: data,
    loading,
    refresh,
    forProduct,
    /** Capability resolvida no servidor (uma consulta por sessão). */
    canCapability: (productKey: string, capabilityKey: string) =>
      makeCan(forProduct(productKey)?.capabilities)(capabilityKey),
    can: (productKey: string, key: string) => hasFeature(forProduct(productKey), key),
    limit: (productKey: string, key: string) => limitOf(forProduct(productKey), key),
    within: (productKey: string, key: string, used: number) =>
      withinLimit(forProduct(productKey), key, used),
  };
}
