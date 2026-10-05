/** Aceita só URLs de retorno para domínios próprios do hub (evita open redirect). */
const ALLOWED_HOSTS = new Set([
  "xfts-flexus.com",
  "www.xfts-flexus.com",
  "xfts-site.lovable.app",
  "localhost",
]);

export function safeReturnUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value || value.length > 2048) return undefined;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("URL de retorno inválida");
  }
  const host = url.hostname.toLowerCase();
  const isLocal = host === "localhost" && url.protocol === "http:";
  const okHost =
    ALLOWED_HOSTS.has(host) ||
    (host.endsWith(".lovable.app") && host.includes("26205ede-bbe4-4e90-90d5-5be5b0db494b"));
  if (!okHost || (!isLocal && url.protocol !== "https:")) {
    throw new Error("URL de retorno não permitida");
  }
  return value;
}
