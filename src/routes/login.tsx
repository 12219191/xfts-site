import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Stethoscope, Scissors, Sparkles, ExternalLink } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login - XFTS Inteligência Analítica" },
      { name: "description", content: "Acesse seu sistema SaaS XFTS. Gestão Clínica, Barbearias ou Estéticas." },
    ],
  }),
  component: LoginPage,
});

const systems = [
  { icon: Stethoscope, title: "Gestão Clínica", desc: "Acesse o sistema de gestão para clínicas e consultórios.", color: "text-blue-600" },
  { icon: Scissors, title: "Gestão de Barbearias", desc: "Acesse o sistema de gestão para barbearias e salões.", color: "text-amber-600" },
  { icon: Sparkles, title: "Gestão de Estéticas", desc: "Acesse o sistema para clínicas de estética e salões de beleza.", color: "text-pink-500" },
];

function LoginPage() {
  const [selected, setSelected] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Login será implementado em breve. Por favor, entre em contato para acessar o sistema.");
  };

  return (
    <>
      <section className="gradient-primary section-padding text-center">
        <div className="container-wide">
          <h1 className="text-4xl font-extrabold text-primary-foreground md:text-5xl">Acesso aos Sistemas</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/70">Selecione o sistema que deseja acessar.</p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide mx-auto max-w-3xl">
          <div className="grid gap-6 md:grid-cols-3">
            {systems.map((sys, i) => (
              <Card
                key={sys.title}
                className={`cursor-pointer border-2 transition-all ${selected === i ? "border-cta shadow-lg" : "border-border hover:border-primary/30"} bg-card`}
                onClick={() => setSelected(i)}
              >
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <sys.icon className={`h-10 w-10 ${sys.color}`} />
                  <h3 className="mt-3 text-sm font-semibold text-card-foreground">{sys.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{sys.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {selected !== null && (
            <Card className="mt-8 border-border bg-card">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-card-foreground">Acessar {systems[selected].title}</h2>
                <form className="mt-6 grid gap-4" onSubmit={handleLogin}>
                  <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <Input placeholder="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Entrar <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                  <button type="button" className="text-sm text-primary hover:underline" onClick={() => alert("Funcionalidade de recuperação de senha em desenvolvimento.")}>
                    Esqueceu sua senha?
                  </button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </>
  );
}
