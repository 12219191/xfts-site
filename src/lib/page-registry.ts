/**
 * Catálogo único de páginas do site.
 * Fonte de verdade para tracking, formulários e painel admin.
 */

export type PageGroup =
  | "Home"
  | "Produtos"
  | "Institucional"
  | "Conteúdo"
  | "Conta"
  | "Admin";

export type PageInfo = {
  /** slug canônico usado em cta_id e nos relatórios */
  slug: string;
  /** nome legível exibido no admin */
  name: string;
  group: PageGroup;
};

export const PAGES: Record<string, PageInfo> = {
  "/": { slug: "home", name: "Home", group: "Home" },
  "/produtos": { slug: "produtos", name: "Produtos — Catálogo", group: "Produtos" },
  "/produtos/comparar-planos": {
    slug: "comparar-planos",
    name: "Comparar Planos",
    group: "Produtos",
  },
  "/produtos/gestao-clinica": {
    slug: "clinica",
    name: "FLEXUS | Clínica — Produto",
    group: "Produtos",
  },
  "/produtos/gestao-barbearias": {
    slug: "barbearia",
    name: "FLEXUS | Barbearia — Produto",
    group: "Produtos",
  },
  "/produtos/gestao-esteticas": {
    slug: "estetica",
    name: "FLEXUS | Estética — Produto",
    group: "Produtos",
  },
  "/produtos/flexus-aba": {
    slug: "aba",
    name: "FLEXUS | ABA — Produto",
    group: "Produtos",
  },
  "/produtos/flexus-crm": {
    slug: "crm",
    name: "FLEXUS | CRM — Produto",
    group: "Produtos",
  },
  "/produtos/flexus-casa360": {
    slug: "casa360",
    name: "FLEXUS | Casa360° — Produto",
    group: "Produtos",
  },
  "/contato": { slug: "contato", name: "Contato", group: "Institucional" },
  "/exclusao-de-dados": {
    slug: "exclusao-de-dados",
    name: "Exclusão de Dados",
    group: "Institucional",
  },
  "/politica-de-privacidade": {
    slug: "politica-de-privacidade",
    name: "Política de Privacidade",
    group: "Institucional",
  },
  "/termos-de-uso": {
    slug: "termos-de-uso",
    name: "Termos de Uso",
    group: "Institucional",
  },
  "/blog": { slug: "blog", name: "Blog — Lista", group: "Conteúdo" },
  "/login": { slug: "login", name: "Login", group: "Conta" },
  "/reset-password": {
    slug: "reset-password",
    name: "Redefinir Senha",
    group: "Conta",
  },
  "/minha-conta": { slug: "minha-conta", name: "Área do Cliente", group: "Conta" },
  "/checkout": { slug: "checkout", name: "Checkout", group: "Conta" },
  "/checkout/retorno": {
    slug: "checkout-retorno",
    name: "Checkout — Retorno",
    group: "Conta",
  },
  "/admin": { slug: "admin", name: "Admin", group: "Admin" },
};

const UNKNOWN: PageInfo = { slug: "desconhecida", name: "Página desconhecida", group: "Institucional" };

function normalizePath(pathname: string): string {
  if (!pathname) return "/";
  const clean = pathname.split("?")[0].split("#")[0];
  if (clean.length > 1 && clean.endsWith("/")) return clean.slice(0, -1);
  return clean;
}

/** Resolve uma rota (com fallback para rotas dinâmicas) em página legível. */
export function resolvePage(pathname: string): PageInfo {
  const path = normalizePath(pathname);
  const exact = PAGES[path];
  if (exact) return exact;

  if (path.startsWith("/blog/")) {
    return { slug: "blog-artigo", name: "Blog — Artigo", group: "Conteúdo" };
  }
  if (path.startsWith("/produtos/")) {
    return { slug: path.replace("/produtos/", ""), name: `Produto — ${path}`, group: "Produtos" };
  }
  return { ...UNKNOWN, slug: path.replace(/^\//, "") || "home", name: path };
}

/** Página atual do navegador (vazio no servidor). */
export function currentPage(): PageInfo {
  if (typeof window === "undefined") return UNKNOWN;
  return resolvePage(window.location.pathname);
}

/** Nome legível a partir do slug canônico (usado no admin). */
export function pageNameBySlug(slug: string | null | undefined): string {
  if (!slug) return "—";
  const found = Object.values(PAGES).find((p) => p.slug === slug);
  if (found) return found.name;
  if (slug === "blog-artigo") return "Blog — Artigo";
  // registros antigos gravavam o pathname cru
  if (slug.startsWith("/")) return resolvePage(slug).name;
  return slug;
}

export const PAGE_OPTIONS = Object.values(PAGES).map((p) => ({
  value: p.slug,
  label: p.name,
  group: p.group,
}));
