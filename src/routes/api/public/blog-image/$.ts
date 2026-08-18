import { createFileRoute } from "@tanstack/react-router";

/**
 * Serve as imagens do blog guardadas no bucket privado `blog-images`.
 * O bucket é privado (buckets públicos estão bloqueados na workspace),
 * então esta rota pública faz o proxy da leitura com o cliente admin.
 */
export const Route = createFileRoute("/api/public/blog-image/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        if (!path || path.includes("..")) {
          return new Response("Not found", { status: 404 });
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { data, error } = await supabaseAdmin.storage
          .from("blog-images")
          .download(path);

        if (error || !data) {
          return new Response("Not found", { status: 404 });
        }

        return new Response(await data.arrayBuffer(), {
          headers: {
            "Content-Type": data.type || "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
