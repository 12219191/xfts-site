import { Link } from "@tanstack/react-router";
import { Instagram, Linkedin, Facebook } from "lucide-react";
import { Logo } from "@/components/Logo";
import { trackCTAClick } from "@/lib/tracking";
import { openCookiePreferences } from "@/lib/consent";


export function Footer() {
  return (
    <footer className="gradient-primary text-primary-foreground">
      <div className="container-wide section-padding grid gap-8 md:grid-cols-4">
        <div>
          <Logo size={40} variant="mark" inverted />
          <h3 className="mt-3 text-lg font-bold">XFTS Inteligência Analítica</h3>
          <p className="mt-2 text-sm text-primary-foreground/70">
            Transformamos dados em decisões inteligentes para o seu negócio.
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground/60">Navegação</h4>
          <nav className="flex flex-col gap-2 text-sm">
            <Link to="/" className="text-primary-foreground/80 hover:text-primary-foreground" onClick={() => trackCTAClick({ section: "footer-nav", label: "Home", destination: "/" })}>Home</Link>
            <Link to="/produtos" className="text-primary-foreground/80 hover:text-primary-foreground" onClick={() => trackCTAClick({ section: "footer-nav", label: "Produtos", destination: "/produtos" })}>Produtos</Link>
            <Link to="/blog" className="text-primary-foreground/80 hover:text-primary-foreground" onClick={() => trackCTAClick({ section: "footer-nav", label: "Blog", destination: "/blog" })}>Blog</Link>
            <Link to="/contato" className="text-primary-foreground/80 hover:text-primary-foreground" onClick={() => trackCTAClick({ section: "footer-nav", label: "Contato", destination: "/contato" })}>Contato</Link>
          </nav>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground/60">Contato</h4>
          <div className="flex flex-col gap-2 text-sm text-primary-foreground/80">
            <span>(17) 99794-3349</span>
            <span>xfts@xfts.com.br</span>
            <span>São José do Rio Preto, SP - Brasil</span>
          </div>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground/60">Redes</h4>
          <div className="flex gap-4">
            <a href="https://www.instagram.com/xftsolucoes/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" onClick={() => trackCTAClick({ section: "footer-social", label: "Instagram", destination: "https://www.instagram.com/xftsolucoes/" })}>
              <Instagram className="h-5 w-5 text-primary-foreground/80 hover:text-primary-foreground" />
            </a>
            <a href="https://www.linkedin.com/company/xftsconsultoriaemgest%C3%A3oempresarial/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" onClick={() => trackCTAClick({ section: "footer-social", label: "LinkedIn", destination: "https://www.linkedin.com/company/xftsconsultoriaemgest%C3%A3oempresarial/" })}>
              <Linkedin className="h-5 w-5 text-primary-foreground/80 hover:text-primary-foreground" />
            </a>
            <a href="https://www.facebook.com/XFTSolucoes" target="_blank" rel="noopener noreferrer" aria-label="Facebook" onClick={() => trackCTAClick({ section: "footer-social", label: "Facebook", destination: "https://www.facebook.com/XFTSolucoes" })}>
              <Facebook className="h-5 w-5 text-primary-foreground/80 hover:text-primary-foreground" />
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10 px-4 py-4 text-center text-xs text-primary-foreground/50">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <span>© 2026 XFTS Inteligência Analítica. Todos os direitos reservados.</span>
          <span>Hospedado na Hostinger</span>
          <Link to="/politica-de-privacidade" className="hover:text-primary-foreground" onClick={() => trackCTAClick({ section: "footer-legal", label: "Política de Privacidade", destination: "/politica-de-privacidade" })}>Política de Privacidade</Link>
          <Link to="/termos-de-uso" className="hover:text-primary-foreground" onClick={() => trackCTAClick({ section: "footer-legal", label: "Termos de Uso", destination: "/termos-de-uso" })}>Termos de Uso</Link>
          <button type="button" className="hover:text-primary-foreground" onClick={openCookiePreferences}>Preferências de cookies</button>
          <Link to="/exclusao-de-dados" className="hover:text-primary-foreground" onClick={() => trackCTAClick({ section: "footer-legal", label: "Exclusão de Dados", destination: "/exclusao-de-dados" })}>Exclusão de Dados</Link>
        </div>
      </div>
    </footer>
  );
}
