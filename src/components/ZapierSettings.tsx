import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import { getZapierWebhookUrl, setZapierWebhookUrl } from "@/lib/zapier";

export function ZapierSettings() {
  const [url, setUrl] = useState(getZapierWebhookUrl);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setZapierWebhookUrl(url);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setOpen(false);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" title="Configurar Zapier">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar Webhook Zapier</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Cole a URL do webhook do seu Zap para receber os dados dos formulários automaticamente por email.
        </p>
        <Input
          placeholder="https://hooks.zapier.com/hooks/catch/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button onClick={handleSave} className="bg-cta text-cta-foreground hover:bg-cta/90">
          {saved ? "✓ Salvo!" : "Salvar"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
