import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { trackCTAClick } from "@/lib/tracking";


export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading } = useAuth();

  const publicLinks = [
    { to: "/", label: "Home" },
    { to: "/produtos", label: "Produtos" },
    { to: "/produtos/comparar-planos", label: "Planos" },
    { to: "/blog", label: "Blog" },
    { to: "/contato", label: "Contato" },
  ] as const;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="container-wide flex h-16 items-center justify-between px-4 md:px-8">
        <Link
          to="/"
          className="flex items-center"
          aria-label="XFTS Inteligência Analítica - Home"
          onClick={() => trackCTAClick({ section: "header", action: "logo", label: "Logo XFTS", destination: "/" })}
        >
          <Logo size={32} compactSubtitle />
        </Link>


        <nav className="hidden items-center gap-6 md:flex">
          {publicLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
              activeProps={{ className: "text-sm font-medium text-primary" }}
              onClick={() =>
                trackCTAClick({ section: "header-nav", label: link.label, destination: link.to })
              }
            >
              {link.label}
            </Link>
          ))}

          {!loading && user ? (
            <>
              <Link
                to="/minha-conta"
                className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
                activeProps={{ className: "text-sm font-medium text-primary" }}
                onClick={() =>
                  trackCTAClick({ section: "header", action: "minha-conta", label: "Minha Conta", destination: "/minha-conta" })
                }
              >
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  Minha Conta
                </span>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground" aria-label="Sair da conta" title="Sair da conta">
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </Button>
            </>
          ) : !loading ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/login" onClick={() => trackCTAClick({ section: "header", action: "login", label: "Login", destination: "/login" })}>Login</Link>
            </Button>
          ) : null}

          <Button asChild className="bg-cta text-cta-foreground hover:bg-cta/90">
            <Link to="/contato" onClick={() => trackCTAClick({ section: "header", action: "demo", label: "Solicite Demo", destination: "/contato", placement: "topo" })}>Solicite Demo</Link>
          </Button>
        </nav>

        <button
          type="button"
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-md md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={mobileOpen}
          aria-controls="menu-mobile"
        >
          {mobileOpen ? <X className="h-6 w-6 text-foreground" /> : <Menu className="h-6 w-6 text-foreground" />}
        </button>
      </div>

      {mobileOpen && (
        <div id="menu-mobile" className="border-t border-border bg-card px-4 py-4 md:hidden">
          <nav aria-label="Menu principal" className="flex flex-col gap-1">
            {publicLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
                activeProps={{ className: "py-2.5 text-sm font-medium text-primary" }}
                onClick={() => {
                  trackCTAClick({ section: "header-mobile-nav", label: link.label, destination: link.to });
                  setMobileOpen(false);
                }}
              >
                {link.label}
              </Link>
            ))}

            {!loading && user ? (
              <>
                <Link
                  to="/minha-conta"
                  className="py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
                  activeProps={{ className: "py-2.5 text-sm font-medium text-primary" }}
                  onClick={() => setMobileOpen(false)}
                >
                  Minha Conta
                </Link>
                <button
                  type="button"
                  className="py-2.5 text-left text-sm font-medium text-muted-foreground hover:text-destructive"
                  onClick={() => { handleLogout(); setMobileOpen(false); }}
                >
                  Sair
                </button>
              </>
            ) : !loading ? (
              <Button asChild variant="outline" size="sm" className="mt-2 w-full">
                <Link
                  to="/login"
                  onClick={() => {
                    trackCTAClick({ section: "header-mobile", action: "login", label: "Login", destination: "/login" });
                    setMobileOpen(false);
                  }}
                >
                  Login
                </Link>
              </Button>
            ) : null}

            <Button asChild className="mt-2 w-full bg-cta text-cta-foreground hover:bg-cta/90">
              <Link
                to="/contato"
                onClick={() => {
                  trackCTAClick({ section: "header-mobile", action: "demo", label: "Solicite Demo (menu mobile)", destination: "/contato", placement: "topo" });
                  setMobileOpen(false);
                }}
              >
                Solicite Demo
              </Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
