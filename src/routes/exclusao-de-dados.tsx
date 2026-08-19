import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LegalPageLayout, type LegalSection } from "@/components/LegalPageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sendToZapier, formatSentAt, type ZapierResult } from "@/lib/zapier";
import { toast } from "sonner";

export const Route = createFileRoute("/exclusao-de-dados")({
  head: () => ({
    meta: [
      { title: "Exclusão de Dados do Usuário - XFTS Inteligência Analítica" },
      { name: "description", content: "Instruções e formulário para solicitar a exclusão de dados pessoais nos sistemas da XFTS, incluindo o FLEXUS CRM." },
      { property: "og:title", content: "Exclusão de Dados do Usuário - XFTS Inteligência Analítica" },
      { property: "og:description", content: "Como solicitar a exclusão de seus dados pessoais armazenados nos sistemas da XFTS." },
      { property: "og:url", content: "https://xfts-site.lovable.app/exclusao-de-dados" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://xfts-site.lovable.app/exclusao-de-dados" }],
  }),
  component: ExclusaoDeDadosPage,
});

function SolicitacaoExclusaoForm() {
  const [form, setForm] = useState({ nome: "", email: "", empresa: "", motivo: "" });
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<ZapierResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setStatus(null);
    const result = await sendToZapier(
      {
        nome: form.nome,
        email: form.email,
        empresa: form.empresa,
        motivo: form.motivo,
        assunto: "Solicitação de Exclusão de Dados",
      },
      "contato"
    );
    if (result.success) {
      setForm({ nome: "", email: "", empresa: "", motivo: "" });
      toast.success("Solicitação de exclusão registrada", {
        description: `Recebida em ${formatSentAt(result.sentAt)}. Responderemos em até 15 dias, conforme a LGPD. Protocolo: ${result.referenceId}.`,
        duration: 12000,
      });
    } else {
      toast.error("Não foi possível enviar", { description: result.message, duration: 12000 });
    }
    setStatus(result);
    setSending(false);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm text-foreground/80">
          Preencha o formulário abaixo para enviar sua solicitação diretamente ao time responsável.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-3">
        <div className="grid gap-1.5">
          <label htmlFor="excl-nome" className="text-xs font-medium text-foreground">Nome completo *</label>
          <Input id="excl-nome" required maxLength={120} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="excl-email" className="text-xs font-medium text-foreground">E-mail cadastrado *</label>
          <Input id="excl-email" type="email" required maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="excl-empresa" className="text-xs font-medium text-foreground">Empresa (quando aplicável)</label>
          <Input id="excl-empresa" maxLength={120} value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="excl-motivo" className="text-xs font-medium text-foreground">Motivo da solicitação (opcional)</label>
          <Textarea id="excl-motivo" rows={4} maxLength={1000} value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
        </div>
        <Button type="submit" disabled={sending} className="bg-cta text-cta-foreground hover:bg-cta/90">
          {sending ? "Enviando..." : "Enviar solicitação"}
        </Button>
        {status && (
          <div
            role="status"
            aria-live="polite"
            className={`rounded-md border p-3 text-xs ${status.success ? "border-cta/40 bg-cta/10" : "border-destructive/40 bg-destructive/10"}`}
          >
            <p className="text-sm font-medium text-foreground">
              {status.success ? "Solicitação registrada" : "Envio não concluído"}
            </p>
            <p className="mt-1 text-muted-foreground">{status.message}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Status: {status.status}
              {status.referenceId ? ` · Protocolo ${status.referenceId}` : ""} · {formatSentAt(status.sentAt)} · {status.durationMs}ms
            </p>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          Ao enviar, você concorda que utilizaremos os dados informados apenas para processar sua solicitação de exclusão.
        </p>
      </form>
    </div>
  );
}

const sections: LegalSection[] = [
  {
    id: "como-solicitar",
    number: "01",
    title: "Como solicitar a exclusão",
    content: (
      <>
        <p>O titular dos dados poderá solicitar a exclusão de suas informações por qualquer um dos seguintes meios:</p>
        <ul className="list-disc space-y-2 pl-6 marker:text-primary">
          <li>
            Formulário nesta página (seção 06);
          </li>
          <li>
            E-mail:{" "}
            <a href="mailto:xfts@xfts.com.br" className="text-primary underline-offset-4 hover:underline">
              xfts@xfts.com.br
            </a>
          </li>
          <li>Pelo próprio sistema, quando essa funcionalidade estiver disponível.</li>
        </ul>
        <p>No pedido, informe:</p>
        <ul className="list-disc space-y-2 pl-6 marker:text-primary">
          <li>Nome completo;</li>
          <li>Endereço de e-mail utilizado no cadastro;</li>
          <li>Empresa (quando aplicável);</li>
          <li>Motivo da solicitação (opcional).</li>
        </ul>
      </>
    ),
  },
  {
    id: "prazo",
    number: "02",
    title: "Prazo de atendimento",
    content: (
      <p>
        Após a confirmação da identidade do solicitante, a solicitação será processada em até{" "}
        <strong>15 dias úteis</strong>, respeitando a legislação aplicável.
      </p>
    ),
  },
  {
    id: "dados-mantidos",
    number: "03",
    title: "Dados que poderão ser mantidos",
    content: (
      <>
        <p>
          Algumas informações poderão ser mantidas quando sua retenção for exigida por obrigação legal, regulatória,
          contratual ou para defesa em processos judiciais e administrativos.
        </p>
        <p>Nesses casos, os dados permanecerão armazenados apenas pelo período legalmente exigido.</p>
      </>
    ),
  },
  {
    id: "dados-excluidos",
    number: "04",
    title: "Dados excluídos",
    content: (
      <>
        <p>Quando não houver impedimento legal, poderão ser excluídos:</p>
        <ul className="list-disc space-y-2 pl-6 marker:text-primary">
          <li>Dados cadastrais;</li>
          <li>Informações de contato;</li>
          <li>Histórico de utilização do sistema;</li>
          <li>Conversas e registros vinculados ao usuário;</li>
          <li>Demais informações pessoais armazenadas pelo sistema.</li>
        </ul>
      </>
    ),
  },
  {
    id: "contato",
    number: "05",
    title: "Contato",
    content: (
      <p>
        Em caso de dúvidas sobre privacidade ou proteção de dados, entre em contato pelos canais indicados no
        rodapé desta página.
      </p>
    ),
  },
  {
    id: "formulario",
    number: "06",
    title: "Formulário de solicitação",
    content: <SolicitacaoExclusaoForm />,
  },
];

function ExclusaoDeDadosPage() {
  return (
    <LegalPageLayout
      breadcrumbLabel="Exclusão de Dados"
      title="Exclusão de Dados do Usuário"
      subtitle="Como solicitar a exclusão de seus dados pessoais armazenados nos sistemas da XFTS, incluindo o FLEXUS CRM e demais aplicações."
      updatedAt="27 de maio de 2026"
      sections={sections}
      intro={
        <>
          <p>
            A <strong>XFTS Inteligência Analítica</strong> respeita a privacidade de seus usuários e oferece um
            processo simples para solicitar a exclusão dos dados pessoais armazenados em nossos sistemas, incluindo o
            FLEXUS CRM e demais aplicações desenvolvidas pela empresa.
          </p>
        </>
      }
    />
  );
}
