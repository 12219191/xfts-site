import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SITE_URL = "https://xfts.com.br";

const staticRoutes = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/produtos", priority: "0.9", changefreq: "monthly" },
  { path: "/produtos/gestao-clinica", priority: "0.8", changefreq: "monthly" },
  { path: "/produtos/gestao-barbearias", priority: "0.8", changefreq: "monthly" },
  { path: "/produtos/gestao-esteticas", priority: "0.8", changefreq: "monthly" },
  { path: "/produtos/flexus-aba", priority: "0.8", changefreq: "monthly" },
  { path: "/produtos/flexus-crm", priority: "0.8", changefreq: "monthly" },
  { path: "/blog", priority: "0.8", changefreq: "daily" },
  { path: "/contato", priority: "0.7", changefreq: "monthly" },
  { path: "/termos-de-uso", priority: "0.3", changefreq: "yearly" },
  { path: "/politica-de-privacidade", priority: "0.3", changefreq: "yearly" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { data: articles } = await supabaseAdmin
          .from("blog_articles")
          .select("slug, updated_at")
          .eq("published", true)
          .order("updated_at", { ascending: false });

        const staticUrls = staticRoutes.map(
          (r) =>
            `  <url>
    <loc>${SITE_URL}${r.path}</loc>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
        );

        const articleUrls = (articles ?? []).map(
          (a) =>
            `  <url>
    <loc>${SITE_URL}/blog/${a.slug}</loc>
    <lastmod>${new Date(a.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
        );

        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...articleUrls].join("\n")}
</urlset>`;

        return new Response(sitemap, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});
