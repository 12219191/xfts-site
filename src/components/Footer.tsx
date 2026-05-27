import { Link } from "@tanstack/react-router";
import { Instagram, Linkedin, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="gradient-primary text-primary-foreground">
      <div className="container-wide section-padding grid gap-8 md:grid-cols-4">
        <div>
          <h3 className="text-lg font-bold">XFTS Inteligência Analítica</h3>
          <p className="mt-2 text-sm text-primary-foreground/70">
            Transformamos dados em decisões inteligentes para o seu negócio.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground/60">Navegação</h4>
          <nav className="flex flex-col gap-2 text-sm">
            <Link to="/" className="text-primary-foreground/80 hover:text-primary-foreground">Home</Link>
            <Link to="/produtos" className="text-primary-foreground/80 hover:text-primary-foreground">Produtos</Link>
            <Link to="/blog" className="text-primary-foreground/80 hover:text-primary-foreground">Blog</Link>
            <Link to="/contato" className="text-primary-foreground/80 hover:text-primary-foreground">Contato</Link>
          </nav>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground/60">Contato</h4>
          <div className="flex flex-col gap-2 text-sm text-primary-foreground/80">
            <span>(11) 99999-9999</span>
            <span>xfts@xfts.com.br</span>
            <span>São José do Rio Preto, SP - Brasil</span>
          </div>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground/60">Redes</h4>
          <div className="flex gap-4">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <Instagram className="h-5 w-5 text-primary-foreground/80 hover:text-primary-foreground" />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <Linkedin className="h-5 w-5 text-primary-foreground/80 hover:text-primary-foreground" />
            </a>
            <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
              <Phone className="h-5 w-5 text-primary-foreground/80 hover:text-primary-foreground" />
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10 px-4 py-4 text-center text-xs text-primary-foreground/50">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <span>© 2026 XFTS Inteligência Analítica. Todos os direitos reservados.</span>
          <span>Hospedado na Hostinger</span>
          <Link to="/" className="hover:text-primary-foreground">Política de Privacidade</Link>
          <Link to="/" className="hover:text-primary-foreground">Termos de Uso</Link>
        </div>
      </div>
    </footer>
  );
}
