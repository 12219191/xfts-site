import { CreditCard, CalendarClock, ShieldCheck, FileText, RefreshCw, Ban } from "lucide-react";

const methods = [
  {
    icon: CreditCard,
    title: "Cartão de crédito",
    desc: "A contratação é feita online, com cartão de crédito, direto nesta página.",
  },
  {
    icon: CalendarClock,
    title: "Mensal ou anual",
    desc: "Escolha a cobrança mensal ou anual. No anual você paga 12 meses com 20% de desconto.",
  },
  {
    icon: RefreshCw,
    title: "Renovação automática",
    desc: "A assinatura renova sozinha ao fim de cada ciclo, sem precisar refazer o pagamento.",
  },
  {
    icon: Ban,
    title: "Cancele quando quiser",
    desc: "Sem fidelidade. Ao cancelar, o acesso continua até o fim do período já pago.",
  },
  {
    icon: FileText,
    title: "Faturas e recibos",
    desc: "Todas as faturas ficam disponíveis na sua área do cliente para download.",
  },
  {
    icon: ShieldCheck,
    title: "Ambiente seguro",
    desc: "O pagamento é processado em ambiente certificado. Não armazenamos dados do seu cartão.",
  },
];

const faq = [
  {
    q: "Posso trocar de plano depois?",
    a: "Sim. Ao subir de plano a diferença é cobrada de forma proporcional aos dias restantes do ciclo, e os novos recursos liberam na hora.",
  },
  {
    q: "E se eu quiser um plano menor?",
    a: "A redução de plano fica agendada para o início do próximo ciclo, então você aproveita o que já pagou até o fim do período.",
  },
  {
    q: "O que acontece se o pagamento falhar?",
    a: "Avisamos por e-mail e tentamos novamente por alguns dias. O acesso só é suspenso depois desse período de carência.",
  },
  {
    q: "Preciso instalar alguma coisa?",
    a: "Não. O sistema é 100% online: assim que a assinatura é confirmada, o acesso é liberado no seu login.",
  },
];

export function PaymentInfoSection() {
  return (
    <section className="section-padding">
      <div className="container-wide">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-foreground">Como funciona o pagamento</h2>
          <p className="mt-3 text-muted-foreground">
            Transparência total sobre cobrança, renovação e cancelamento antes de você assinar.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {methods.map((m) => (
            <div key={m.title} className="rounded-2xl border border-border bg-card p-5">
              <m.icon className="h-6 w-6 text-primary" aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-foreground">{m.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{m.desc}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
          {faq.map((f) => (
            <div key={f.q} className="rounded-xl border border-border bg-surface p-5">
              <h3 className="text-sm font-semibold text-foreground">{f.q}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
