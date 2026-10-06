/** Utilidades HTTP compartilhadas pelas rotas /api/public/support-session/*. */
export const SUPPORT_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-flexus-app-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function supportJson(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { ...SUPPORT_CORS, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const v = (await request.json()) as unknown;
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const str = (v: unknown, max = 200) => (typeof v === "string" && v.length <= max ? v : "");
