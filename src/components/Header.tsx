import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/produtos", label: "Produtos" },
    { to: "/blog", label: "Blog" },
    { to: "/login", label: "Login" },
    { to: "/contato", label: "Contato" },
  ] as const;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="container-wide flex h-16 items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-extrabold tracking-tight text-primary">XFTS</span>
          <span className="hidden text-sm font-medium text-muted-foreground sm:inline">Inteligência Analítica</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
              activeProps={{ className: "text-sm font-medium text-primary" }}
            >
              {link.label}
            </Link>
          ))}
          <Link to="/contato">
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
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
                activeProps={{ className: "text-sm font-medium text-primary" }}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link to="/contato" onClick={() => setMobileOpen(false)}>
              <Button className="w-full bg-cta text-cta-foreground hover:bg-cta/90">Solicite Demo</Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
