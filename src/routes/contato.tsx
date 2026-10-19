import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin } from "lucide-react";
import { useState } from "react";
import { sendToZapier, formatSentAt, type ZapierResult } from "@/lib/zapier";
import { toast } from "sonner";
import { trackFormSubmit } from "@/lib/tracking";
import { WhatsAppInlineButton } from "@/components/WhatsAppButton";
import { organizationJsonLd } from "@/lib/structured-data";

export const SEGMENTOS = ["clinica", "barbearia", "estetica", "aba", "crm", "casa360", "atende", "outro"] as const;
export type Segmento = (typeof SEGMENTOS)[number];

export const Route = createFileRoute("/contato")({
  validateSearch: (search: Record<string, unknown>): { segmento?: Segmento } => {
    const s = search.segmento as Segmento;
    return SEGMENTOS.includes(s) ? { segmento: s } : {};
  },
  head: () => ({
    meta: [
      { title: "Contato - XFTS Inteligência Analítica" },
      { name: "description", content: "Entre em contato com a XFTS. Solicite uma demonstração gratuita dos sistemas FLEXUS ou tire suas dúvidas com nosso time." },
      { property: "og:title", content: "Contato - XFTS Inteligência Analítica" },
      { property: "og:description", content: "Solicite uma demonstração gratuita dos sistemas FLEXUS ou fale com nosso time." },
      { property: "og:url", content: "https://xfts-flexus.com/contato" },
      { name: "twitter:title", content: "Contato - XFTS Inteligência Analítica" },
      { name: "twitter:description", content: "Solicite uma demonstração gratuita dos sistemas FLEXUS ou fale com nosso time." },
    ],
    links: [{ rel: "canonical", href: "https://xfts-flexus.com/contato" }],
    scripts: [organizationJsonLd()],
  }),
  component: ContatoPage,
});

function ContatoPage() {
  const { segmento: initialSegmento } = Route.useSearch();
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", mensagem: "", segmento: initialSegmento ?? "" });

  const [sending, setSending] = useState(false);
  const [lastStatus, setLastStatus] = useState<ZapierResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const email = form.email;
    const result = await sendToZapier(form, "contato", "contato_mensagem");
    if (result.success) {
      trackFormSubmit("contato", form.segmento);
      setForm({ nome: "", email: "", telefone: "", mensagem: "", segmento: "" });
      toast.success("Mensagem enviada com sucesso", {
        description: `Enviamos sua mensagem para nosso time em ${formatSentAt(result.sentAt)}. Retornamos em até 1 dia útil no e-mail ${email}. Protocolo: ${result.referenceId}.`,
        duration: 10000,
      });
    } else {
      toast.error("Não foi possível enviar", {
        description: result.message,
        duration: 12000,
      });
    }
    setLastStatus(result);
    setSending(false);
  };

  return (
    <>
      <section className="gradient-primary section-padding text-center">
        <div className="container-wide">
          <h1 className="text-4xl font-extrabold text-primary-foreground md:text-5xl">Contato</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/70">Fale conosco e descubra como podemos transformar seu negócio.</p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide grid gap-12 lg:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-foreground">Envie uma mensagem</h2>
            </div>
            <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
              <Input placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
              <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <Input placeholder="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} required />
              <select className="rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground" value={form.segmento} onChange={(e) => setForm({ ...form, segmento: e.target.value })} required>
                <option value="">Selecione o segmento</option>
                <option value="clinica">Clínica</option>
                <option value="barbearia">Barbearia</option>
                <option value="estetica">Estética / Salão</option>
                <option value="aba">Clínica ABA</option>
                <option value="crm">CRM de vendas</option>
                <option value="casa360">Casa360°</option>
                <option value="atende">Atendimento (WhatsApp)</option>
                <option value="outro">Outro</option>
              </select>
              <Textarea placeholder="Sua mensagem" rows={5} value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} required />
              <Button type="submit" className="bg-cta text-cta-foreground hover:bg-cta/90" disabled={sending}>
                {sending ? "Enviando..." : "Enviar Mensagem"}
              </Button>
              {lastStatus && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`rounded-md border p-3 text-sm ${lastStatus.success ? "border-cta/40 bg-cta/10 text-foreground" : "border-destructive/40 bg-destructive/10 text-foreground"}`}
                >
                  <p className="font-medium">
                    {lastStatus.success ? "Recebemos sua mensagem" : "Envio não concluído"}
                  </p>
                  <p className="mt-1 text-muted-foreground">{lastStatus.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Status: {lastStatus.status}
                    {lastStatus.referenceId ? ` · Protocolo ${lastStatus.referenceId}` : ""} · {formatSentAt(lastStatus.sentAt)} · {lastStatus.durationMs}ms
                  </p>
                </div>
              )}
            </form>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">Informações de Contato</h2>
            <div className="mt-6 grid gap-6">
              <Card className="border-border bg-card"><CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Phone className="h-5 w-5 text-primary" /></div>
                <div><p className="text-sm font-medium text-card-foreground">Telefone</p><p className="text-sm text-muted-foreground">(17) 99794-3349</p></div>
              </CardContent></Card>
              <Card className="border-border bg-card"><CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Mail className="h-5 w-5 text-primary" /></div>
                <div><p className="text-sm font-medium text-card-foreground">Email</p><p className="text-sm text-muted-foreground">xfts@xfts.com.br</p></div>
              </CardContent></Card>
              <Card className="border-border bg-card"><CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><MapPin className="h-5 w-5 text-primary" /></div>
                <div><p className="text-sm font-medium text-card-foreground">Endereço</p><p className="text-sm text-muted-foreground">São José do Rio Preto, SP - Brasil</p></div>
              </CardContent></Card>
              <WhatsAppInlineButton />
            </div>


            <div className="mt-8 aspect-video overflow-hidden rounded-lg border border-border">
              <iframe
                src="https://maps.google.com/maps?q=S%C3%A3o%20Jos%C3%A9%20do%20Rio%20Preto%2C%20SP%2C%20Brasil&z=12&hl=pt-BR&output=embed"
                width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Localização XFTS"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
