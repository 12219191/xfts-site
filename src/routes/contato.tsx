import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato - XFTS Inteligência Analítica" },
      { name: "description", content: "Entre em contato com a XFTS. Solicite uma demonstração ou tire suas dúvidas." },
    ],
  }),
  component: ContatoPage,
});

function ContatoPage() {
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", mensagem: "", segmento: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Mensagem enviada com sucesso! Entraremos em contato em breve.");
    setForm({ nome: "", email: "", telefone: "", mensagem: "", segmento: "" });
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
            <h2 className="text-2xl font-bold text-foreground">Envie uma mensagem</h2>
            <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
              <Input placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
              <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <Input placeholder="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} required />
              <select className="rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground" value={form.segmento} onChange={(e) => setForm({ ...form, segmento: e.target.value })} required>
                <option value="">Selecione o segmento</option>
                <option value="clinica">Clínica</option>
                <option value="barbearia">Barbearia</option>
                <option value="estetica">Estética / Salão</option>
                <option value="outro">Outro</option>
              </select>
              <Textarea placeholder="Sua mensagem" rows={5} value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} required />
              <Button type="submit" className="bg-cta text-cta-foreground hover:bg-cta/90">Enviar Mensagem</Button>
            </form>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">Informações de Contato</h2>
            <div className="mt-6 grid gap-6">
              <Card className="border-border bg-card"><CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Phone className="h-5 w-5 text-primary" /></div>
                <div><p className="text-sm font-medium text-card-foreground">Telefone</p><p className="text-sm text-muted-foreground">(11) 99999-9999</p></div>
              </CardContent></Card>
              <Card className="border-border bg-card"><CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Mail className="h-5 w-5 text-primary" /></div>
                <div><p className="text-sm font-medium text-card-foreground">Email</p><p className="text-sm text-muted-foreground">contato@xfts.com.br</p></div>
              </CardContent></Card>
              <Card className="border-border bg-card"><CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><MapPin className="h-5 w-5 text-primary" /></div>
                <div><p className="text-sm font-medium text-card-foreground">Endereço</p><p className="text-sm text-muted-foreground">Av. Paulista, 1000 - São Paulo, SP</p></div>
              </CardContent></Card>
            </div>

            <div className="mt-8 aspect-video overflow-hidden rounded-lg border border-border">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3657.1976580733966!2d-46.65529192467422!3d-23.56509746145!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ce59c8da0aa315%3A0xd59f9431f2c0776a!2sAv.%20Paulista%2C%20S%C3%A3o%20Paulo%20-%20SP!5e0!3m2!1spt-BR!2sbr!4v1690000000000!5m2!1spt-BR!2sbr"
                width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Localização XFTS"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
