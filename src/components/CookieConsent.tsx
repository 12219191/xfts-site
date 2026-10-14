import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { applyConsent, OPEN_PREFS_EVENT, readConsent, saveConsent } from "@/lib/consent";

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [performance, setPerformance] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const stored = readConsent();
    if (stored) {
      setPerformance(stored.categories.performance);
      setMarketing(stored.categories.marketing);
      applyConsent(stored.categories);
    } else {
      setShowBanner(true);
    }
    const open = () => {
      const s = readConsent();
      setPerformance(s?.categories.performance ?? false);
      setMarketing(s?.categories.marketing ?? false);
      setShowPrefs(true);
    };
    window.addEventListener(OPEN_PREFS_EVENT, open);
    return () => window.removeEventListener(OPEN_PREFS_EVENT, open);
  }, []);

  const decide = (perf: boolean, mkt: boolean) => {
    const saved = saveConsent(perf, mkt);
    applyConsent(saved.categories);
    setPerformance(perf);
    setMarketing(mkt);
    setShowBanner(false);
    setShowPrefs(false);
  };

  return (
    <>
      {showBanner && !showPrefs && (
        <div role="dialog" aria-label="Consentimento de cookies" className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card p-4 shadow-lg">
          <div className="container-wide flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              Usamos cookies essenciais para o site funcionar e, com a sua permissão, cookies de desempenho e marketing.
              Saiba mais na{" "}
              <Link to="/politica-de-privacidade" className="text-primary underline">Política de Privacidade</Link>.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setShowPrefs(true)}>Personalizar</Button>
              <Button variant="outline" onClick={() => decide(false, false)}>Recusar</Button>
              <Button onClick={() => decide(true, true)}>Aceitar todos</Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showPrefs} onOpenChange={setShowPrefs}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preferências de cookies</DialogTitle>
            <DialogDescription>Escolha quais cookies você permite. Você pode mudar a qualquer momento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Row title="Essenciais" desc="Necessários para o site funcionar, como login e segurança. Sempre ativos." checked disabled />
            <Row title="Desempenho" desc="Medem visitas e uso do site (Google Analytics)." checked={performance} onChange={setPerformance} />
            <Row title="Marketing" desc="Anúncios e medição de campanhas (Google e Meta)." checked={marketing} onChange={setMarketing} />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => decide(false, false)}>Recusar</Button>
            <Button variant="outline" onClick={() => decide(performance, marketing)}>Salvar escolhas</Button>
            <Button onClick={() => decide(true, true)}>Aceitar todos</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row(props: { title: string; desc: string; checked: boolean; disabled?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{props.title}</p>
        <p className="text-xs text-muted-foreground">{props.desc}</p>
      </div>
      <Switch checked={props.checked} disabled={props.disabled} onCheckedChange={props.onChange} aria-label={props.title} />
    </div>
  );
}
