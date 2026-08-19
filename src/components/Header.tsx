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
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : !loading ? (
            <Link to="/login" onClick={() => trackCTAClick({ section: "header", action: "login", label: "Login", destination: "/login" })}>
              <Button variant="outline" size="sm">Login</Button>
            </Link>
          ) : null}

          <Link to="/contato" onClick={() => trackCTAClick({ section: "header", action: "demo", label: "Solicite Demo", destination: "/contato" })}>
            <Button className="bg-cta text-cta-foreground hover:bg-cta/90">Solicite Demo</Button>
          </Link>
        </nav>

        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
          {mobileOpen ? <X className="h-6 w-6 text-foreground" /> : <Menu className="h-6 w-6 text-foreground" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-card px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {publicLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
                activeProps={{ className: "text-sm font-medium text-primary" }}
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
                  className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
                  activeProps={{ className: "text-sm font-medium text-primary" }}
                  onClick={() => setMobileOpen(false)}
                >
                  Minha Conta
                </Link>
                <button
                  className="text-left text-sm font-medium text-muted-foreground hover:text-destructive"
                  onClick={() => { handleLogout(); setMobileOpen(false); }}
                >
                  Sair
                </button>
              </>
            ) : !loading ? (
              <Link
                to="/login"
                onClick={() => {
                  trackCTAClick({ section: "header-mobile", action: "login", label: "Login", destination: "/login" });
                  setMobileOpen(false);
                }}
              >
                <Button variant="outline" size="sm" className="w-full">Login</Button>
              </Link>
            ) : null}

            <Link
              to="/contato"
              onClick={() => {
                trackCTAClick({ section: "header-mobile", action: "demo", label: "Solicite Demo", destination: "/contato" });
                setMobileOpen(false);
              }}
            >
              <Button className="w-full bg-cta text-cta-foreground hover:bg-cta/90">Solicite Demo</Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
