import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Receptor de webhooks do Holo SEO (article.published / article.updated).
 * Auth: Authorization: Bearer <HOLO_WEBHOOK_SECRET> OU
 *       X-Holo-Signature: sha256=<hex> (HMAC-SHA256 do corpo bruto).
 * Sempre responde JSON. Idempotente: upsert por slug.
 */
const SITE = "https://xfts-flexus.com";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function constantTimeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

async function hmacHex(secret: string, body: ArrayBuffer): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, body);
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const PayloadSchema = z.object({
  event: z.enum(["article.published", "article.updated"]),
  test: z.boolean().optional().default(false),
  version: z.literal(1),
  deliveryId: z.string().uuid(),
  sentAt: z.string().max(64),
  brand: z.object({ id: z.string().max(200), name: z.string().max(300) }).partial().optional(),
  article: z
    .object({
      id: z.string().max(200).optional(),
      slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i).max(200),
      title: z.string().min(1).max(500),
      excerpt: z.string().max(5000).nullish(),
      contentHtml: z.string().max(500_000).nullish(),
      contentMarkdown: z.string().max(500_000).nullish(),
      metaTitle: z.string().max(500).nullish(),
      metaDescription: z.string().max(2000).nullish(),
      featuredImage: z.string().url().max(2000).nullish(),
      images: z.array(z.object({ url: z.string().max(2000), alt: z.string().max(500).nullish() })).max(100).nullish(),
      publishedAt: z.string().max(64).nullish(),
      isRepublish: z.boolean().nullish(),
    })
    .optional(),
});

function htmlToText(html: string): string {
  return html
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gis, "\n\n## $1\n\n")
    .replace(/<\/(p|div|li)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const Route = createFileRoute("/api/public/holo-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["HOLO_WEBHOOK_SECRET"];
        if (!secret) return json({ error: "not_configured" }, 500);

        // 1) Corpo bruto — nada é parseado antes da verificação.
        const raw = await request.arrayBuffer();

        const auth = request.headers.get("authorization") ?? "";
        const sigHeader = request.headers.get("x-holo-signature") ?? "";
        let ok = false;
        if (auth.toLowerCase().startsWith("bearer ")) {
          ok = constantTimeEqual(auth.slice(7).trim(), secret);
        } else if (sigHeader.startsWith("sha256=")) {
          const expected = await hmacHex(secret, raw);
          ok = constantTimeEqual(sigHeader.slice(7).trim().toLowerCase(), expected);
        }
        if (!ok) return json({ error: "unauthorized" }, 401);

        if (!(request.headers.get("content-type") ?? "").includes("application/json")) {
          return json({ error: "unsupported_media_type" }, 415);
        }

        const eventHeader = request.headers.get("x-holo-event");
        const deliveryHeader = request.headers.get("x-holo-delivery");

        let parsed: z.infer<typeof PayloadSchema>;
        try {
          const result = PayloadSchema.safeParse(JSON.parse(new TextDecoder().decode(raw)));
          if (!result.success) return json({ error: "invalid_payload", issues: result.error.issues.slice(0, 5) }, 400);
          parsed = result.data;
        } catch {
          return json({ error: "invalid_json" }, 400);
        }

        if (eventHeader && eventHeader !== parsed.event) {
          return json({ error: "event_mismatch" }, 400);
        }
        const deliveryId = deliveryHeader || parsed.deliveryId;

        if (parsed.test) {
          return json({ ok: true, test: true, deliveryId, received: parsed.event });
        }

        const a = parsed.article;
        if (!a) return json({ error: "missing_article" }, 400);

        const content = a.contentMarkdown?.trim() || (a.contentHtml ? htmlToText(a.contentHtml) : "");
        const row = {
          slug: a.slug.toLowerCase(),
          title: a.metaTitle?.trim() ? a.title : a.title,
          summary: (a.metaDescription || a.excerpt || "").slice(0, 2000),
          content,
          image_url: a.featuredImage || a.images?.[0]?.url || "",
          author: parsed.brand?.name || "XFTS",
          published: true,
          publish_at: a.publishedAt || null,
          updated_at: new Date().toISOString(),
        };

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // Upsert por slug: retentativas com o mesmo deliveryId são idempotentes.
        const { error } = await supabaseAdmin
          .from("blog_articles")
          .upsert(row, { onConflict: "slug" });
        if (error) {
          console.error("[holo-webhook] upsert failed", deliveryId, error.message);
          return json({ error: "store_failed" }, 500);
        }

        return json({ ok: true, deliveryId, url: `${SITE}/blog/${row.slug}` });
      },
    },
  },
});
