import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { captureAttribution, setAttributionWindowDays } from "@/lib/attribution";
import { getAttributionWindow } from "@/lib/attribution-settings.functions";

import { Header } from "@/components/Header";
import { usePageTracking } from "@/hooks/use-page-tracking";
import { Footer } from "@/components/Footer";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { WhatsAppFloatingButton } from "@/components/WhatsAppButton";
import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";
import { Logo } from "@/components/Logo";
import { CookieConsent } from "@/components/CookieConsent";
import { CONSENT_DEFAULT_SCRIPT } from "@/lib/consent";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <Logo size={64} variant="mark" className="mx-auto opacity-40" />
        <h1 className="mt-6 text-7xl font-bold text-primary">404</h1>

        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">A página que você procura não existe.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "XFTS Inteligência Analítica" },
      { name: "author", content: "XFTS Inteligência Analítica" },
      { property: "og:site_name", content: "XFTS Inteligência Analítica" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },

      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" },
    ],
    scripts: [
      // Google Consent Mode v2: tudo negado até o visitante escolher.
      // Precisa vir ANTES das tags de rastreamento.
      { children: CONSENT_DEFAULT_SCRIPT },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  usePageTracking();
  const href = useRouterState({ select: (s) => s.location.href });
  useEffect(() => {
    let cancelled = false;
    getAttributionWindow()
      .then((res) => {
        if (!cancelled) setAttributionWindowDays(res.window_days);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) captureAttribution();
      });
    return () => {
      cancelled = true;
    };
  }, [href]);

  return (
    <div className="flex min-h-screen flex-col">
      <PaymentTestModeBanner />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFloatingButton />
      <Toaster />
      <CookieConsent />
    </div>
  );
}
