import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, Loader2, Receipt } from "lucide-react";
import { listInvoices, type InvoiceRow } from "@/lib/subscriptions.functions";

type StripeEnv = "sandbox" | "live";

const statusMap: Record<string, { label: string; className: string }> = {
  paid: { label: "Paga", className: "border-transparent bg-cta/15 text-cta-foreground" },
  open: { label: "Em aberto", className: "border-transparent bg-gold/20 text-gold-deep" },
  draft: { label: "Rascunho", className: "" },
  uncollectible: { label: "Não recebida", className: "border-transparent bg-destructive/15 text-destructive" },
  void: { label: "Cancelada", className: "" },
};

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function InvoicesSection({
  environment,
  subscriptionId,
}: {
  environment: StripeEnv;
  subscriptionId?: string;
}) {
  const [invoices, setInvoices] = useState<InvoiceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setInvoices(null);
    setError(null);
    listInvoices({ data: { environment, subscriptionId } })
      .then((result) => {
        if (!active) return;
        if ("error" in result) setError(result.error);
        else setInvoices(result.invoices);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Não foi possível carregar as faturas.");
      });
    return () => {
      active = false;
    };
  }, [environment, subscriptionId]);

  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
        <Receipt className="h-5 w-5 text-primary" />
        Faturas Recentes
      </h2>

      {error ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
          {error}
        </div>
      ) : invoices === null ? (
        <div className="flex items-center gap-2 rounded-xl border border-border p-5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando faturas...
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
          Nenhuma fatura emitida até o momento.
        </div>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {invoices.map((inv) => {
              const st = statusMap[inv.status ?? ""] ?? { label: inv.status ?? "—", className: "" };
              return (
                <div
                  key={inv.id}
                  className="flex flex-wrap items-center gap-4 p-4 sm:px-5"
                >
                  <div className="min-w-[10rem] flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {inv.number ? `Fatura ${inv.number}` : "Fatura"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inv.created
                        ? new Date(inv.created).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>

                  <div className="text-sm font-medium text-foreground">
                    {formatMoney(
                      inv.status === "paid" ? inv.amount_paid : inv.amount_due,
                      inv.currency,
                    )}
                  </div>

                  <Badge variant="outline" className={st.className}>
                    {st.label}
                  </Badge>

                  <div className="ml-auto flex gap-2">
                    {inv.pdf_url && (
                      <Button asChild size="sm" variant="outline">
                        <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Download className="mr-1.5 h-4 w-4" />
                          PDF
                        </a>
                      </Button>
                    )}
                    {inv.hosted_invoice_url && (
                      <Button asChild size="sm" variant="ghost">
                        <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-1.5 h-4 w-4" />
                          Abrir
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
