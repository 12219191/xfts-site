import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
type StripeEnv = "sandbox" | "live";
import {
  cancelSubscription,
  reactivateSubscription,
  changePlan,
  createPortalSession,
} from "@/lib/subscriptions.functions";
import { isRealStripeId } from "@/lib/subscription-guards";
import {
  planTierFromPriceId,
  seatsFromPriceId,
  seatsLabel,
} from "@/lib/flexus-apps";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionStatus } from "@/components/SubscriptionStatus";
import { SubscriptionSummary } from "@/components/SubscriptionSummary";
import { PlanUpgradeCard } from "@/components/PlanUpgradeCard";
import { CancelSubscriptionFlow } from "@/components/CancelSubscriptionFlow";
import { MeusSistemas, type SistemaSubscription } from "@/components/MeusSistemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  CreditCard,
  LogOut,
  Settings,
  Shield,
  ArrowUpRight,
  Loader2,
  Users,
  ExternalLink,
} from "lucide-react";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/minha-conta")({
  head: () => ({
    meta: [
      { title: "Minha Conta - XFTS Inteligência Analítica" },
      {
        name: "description",
        content:
          "Gerencie sua assinatura, plano e dados de conta no XFTS FLEXUS.",
      },
    ],
  }),
  component: MinhaContaPage,
});

interface SubscriptionRow {
  id: string;
  stripe_customer_id: string | null;
  status: string;
  product_id: string;
  price_id: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  environment: string;
  created_at: string | null;
}

const planMap: Record<
  string,
  { name: string; tier: string; price: string; features: string[] }
> = {
  basico: {
    name: "Básico",
    tier: "Básico",
    price: "R$ 97",
    features: [
      "Agendamento online",
      "Cadastro de clientes",
      "Relatórios básicos",
    ],
  },
  pro: {
    name: "Profissional",
    tier: "Pro",
    price: "R$ 197",
    features: [
      "Agendamento online",
      "Cadastro de clientes",
      "Relatórios básicos",
      "Financeiro completo",
      "Notificações automáticas",
      "Relatórios avançados",
    ],
  },
  enterprise: {
    name: "Enterprise",
    tier: "Enterprise",
    price: "R$ 397",
    features: [
      "Agendamento online",
      "Cadastro de clientes",
      "Relatórios básicos",
      "Financeiro completo",
      "Notificações automáticas",
      "Relatórios avançados",
      "API & Integrações",
      "Multi-unidades",
      "Suporte prioritário 24/7",
    ],
  },
};

function detectPlanFromProductId(productId: string): string {
  const lower = productId.toLowerCase();
  if (lower.includes("enterprise") || lower.includes("premium")) return "enterprise";
  if (lower.includes("pro") || lower.includes("profissional")) return "pro";
  return "basico";
}

function MinhaContaPage() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [allSubscriptions, setAllSubscriptions] = useState<SistemaSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [upgradeTo, setUpgradeTo] = useState<"basico" | "pro">("pro");

  const env: StripeEnv = getStripeEnvironment() === "live" ? "live" : "sandbox";

  const fetchSubscription = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("environment", env)
      .order("created_at", { ascending: false });
    const rows = (data as SubscriptionRow[]) ?? [];
    setSubscription(rows[0] ?? null);
    setAllSubscriptions(
      rows.map((r) => ({
        price_id: r.price_id,
        status: r.status,
        current_period_end: r.current_period_end,
        cancel_at_period_end: r.cancel_at_period_end,
      })),
    );
  }, [env]);

  useEffect(() => {
    async function load() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        setLoading(false);
        return;
      }
      setUser({ id: authUser.id, email: authUser.email || "" });
      await fetchSubscription(authUser.id);
      setLoading(false);
    }
    load();
  }, [fetchSubscription]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  /** Deriva o lookup key do plano de destino a partir do plano atual. */
  const targetPriceId = (target: "basico" | "pro") => {
    const current = subscription?.price_id ?? "";
    return current.replace(/_(basico|pro)_/, `_${target}_`);
  };

  const runAction = async (fn: () => Promise<{ ok?: true; message?: string; error?: string }>) => {
    setActionLoading(true);
    try {
      const result = await fn();
      if (result.error) {
        toast.error(result.error);
        return false;
      }
      toast.success(result.message ?? "Tudo certo!");
      if (user) await fetchSubscription(user.id);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível concluir a operação.");
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      const result = await createPortalSession({
        data: {
          environment: env,
          returnUrl:
            typeof window !== "undefined" ? `${window.location.origin}/minha-conta` : undefined,
        },
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir o portal.");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancel = async (reason?: string) => {
    setShowCancel(false);
    await runAction(() => cancelSubscription({ data: { environment: env, reason } }));
  };

  const handleReactivate = async () => {
    await runAction(() => reactivateSubscription({ data: { environment: env } }));
  };

  const handleChangePlan = async () => {
    const target = targetPriceId(upgradeTo);
    if (!target) return;
    setShowUpgrade(false);
    await runAction(() =>
      changePlan({ data: { environment: env, targetPriceId: target } }),
    );
  };


  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <section className="section-padding">
        <div className="container-wide mx-auto max-w-lg text-center">
          <Shield className="mx-auto h-16 w-16 text-muted-foreground/40" />
          <h1 className="mt-6 text-2xl font-bold text-foreground">
            Acesso restrito
          </h1>
          <p className="mt-2 text-muted-foreground">
            Faça login para acessar sua conta.
          </p>
          <Button asChild className="mt-6">
            <Link to="/login">Fazer Login</Link>
          </Button>
        </div>
      </section>
    );
  }

  const currentPlanKey = subscription
    ? detectPlanFromProductId(subscription.product_id)
    : null;
  const currentPlan = currentPlanKey ? planMap[currentPlanKey] : null;

  const hasRealBilling = isRealStripeId(subscription?.stripe_customer_id, "cus_");

  const initials = user.email
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Hero header */}
      <section className="border-b border-border bg-muted/30 py-10">
        <div className="container-wide px-4 md:px-8">
          <div className="flex items-center gap-5">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">Minha Conta</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide mx-auto max-w-4xl space-y-8 px-4 md:px-8">
          <MeusSistemas subscriptions={allSubscriptions} />

          <Separator />

          {/* Subscription status */}
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
              <CreditCard className="h-5 w-5 text-primary" />
              Sua Assinatura
            </h2>

            {subscription && currentPlan ? (
              <div className="space-y-4">
                <SubscriptionSummary
                  planName={currentPlan.name}
                  priceId={subscription.price_id}
                  status={subscription.status}
                  currentPeriodEnd={subscription.current_period_end}
                  cancelAtPeriodEnd={subscription.cancel_at_period_end}
                />
                <SubscriptionStatus
                  status={subscription.status as "active" | "trialing" | "past_due" | "canceled" | "incomplete" | "unpaid" | "paused"}
                  currentPeriodEnd={subscription.current_period_end}
                  cancelAtPeriodEnd={subscription.cancel_at_period_end}
                  productName="FLEXUS"
                  planTier={currentPlan.tier}
                />
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center py-10 text-center">
                  <CreditCard className="h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 font-medium text-foreground">
                    Nenhuma assinatura ativa
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Escolha um plano para começar a usar o FLEXUS.
                  </p>
                  <Button asChild className="mt-5 bg-cta text-cta-foreground hover:bg-cta/90">
                    <Link to="/produtos/comparar-planos">
                      Ver Planos
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Actions */}
          {subscription && currentPlan && (
            <>
              <Separator />

              <div>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Settings className="h-5 w-5 text-primary" />
                  Gerenciar Plano
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  {hasRealBilling && currentPlanKey === "basico" && (
                    <Card
                      className="cursor-pointer border-cta/30 transition-all hover:border-cta hover:shadow-md"
                      onClick={() => {
                        setUpgradeTo("pro");
                        setShowUpgrade(true);
                      }}
                    >
                      <CardContent className="flex items-center gap-4 p-5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <ArrowUpRight className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">Upgrade para Pro</p>
                          <p className="text-xs text-muted-foreground">
                            Imediato, com cobrança proporcional ao período restante.
                          </p>
                        </div>
                        <Badge className="ml-auto bg-primary/10 text-primary border-0">
                          Popular
                        </Badge>
                      </CardContent>
                    </Card>
                  )}

                  {hasRealBilling && currentPlanKey === "pro" && (
                    <Card
                      className="cursor-pointer border-border transition-all hover:border-primary hover:shadow-md"
                      onClick={() => {
                        setUpgradeTo("basico");
                        setShowUpgrade(true);
                      }}
                    >
                      <CardContent className="flex items-center gap-4 p-5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Settings className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">Mudar para Básico</p>
                          <p className="text-xs text-muted-foreground">
                            Entra em vigor apenas na próxima renovação.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="border-gold-deep/30">
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
                        <Shield className="h-5 w-5 text-gold-deep" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Plano Enterprise</p>
                        <p className="text-xs text-muted-foreground">
                          API, multi-unidades e suporte 24/7 sob medida.
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline" className="ml-auto">
                        <Link to="/contato">Falar</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Usuários incluídos no plano */}
                <Card className="mt-6 border-border">
                  <CardContent className="flex flex-wrap items-center gap-4 p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-[12rem] flex-1">
                      <p className="font-semibold text-foreground">Usuários do plano</p>
                      <p className="text-xs text-muted-foreground">
                        {seatsLabel(seatsFromPriceId(subscription.price_id))} inclusos no plano{" "}
                        {planTierFromPriceId(subscription.price_id)}. Para liberar mais usuários,
                        faça upgrade de plano.
                      </p>
                    </div>
                    {hasRealBilling && currentPlanKey === "basico" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setUpgradeTo("pro");
                          setShowUpgrade(true);
                        }}
                      >
                        Aumentar limite
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Portal de cobrança do Stripe */}
                {hasRealBilling ? (
                <Card className="mt-4 border-border">
                  <CardContent className="flex flex-wrap items-center gap-4 p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <ExternalLink className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-[12rem] flex-1">
                      <p className="font-semibold text-foreground">Portal de cobrança</p>
                      <p className="text-xs text-muted-foreground">
                        Atualize o cartão, veja faturas e recibos em ambiente seguro do provedor
                        de pagamento. Abre em uma nova aba.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={portalLoading}
                      onClick={handleOpenPortal}
                      className="bg-cta text-cta-foreground hover:bg-cta/90"
                    >
                      {portalLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Abrir portal
                    </Button>
                  </CardContent>
                </Card>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                    Assinatura de demonstração — o portal de cobrança, a troca de plano e o
                    cancelamento ficam disponíveis após uma compra real.
                  </div>
                )}



                {/* Cancel / reactivate */}
                {!hasRealBilling ? null : subscription.cancel_at_period_end ? (
                  <div className="mt-6 rounded-xl border border-gold-deep/40 bg-gold/5 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Cancelamento agendado
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Seu acesso continua ativo até{" "}
                          {subscription.current_period_end
                            ? new Date(subscription.current_period_end).toLocaleDateString("pt-BR")
                            : "o fim do período pago"}
                          .
                        </p>
                      </div>
                      <Button size="sm" disabled={actionLoading} onClick={handleReactivate}>
                        {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Reativar
                      </Button>
                    </div>
                  </div>
                ) : (
                  subscription.status !== "canceled" && (
                    <div className="mt-6 rounded-xl border border-border bg-muted/20 p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">Cancelar assinatura</p>
                          <p className="text-xs text-muted-foreground">
                            Você mantém o acesso até o fim do período já pago.
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/5 hover:text-destructive"
                          onClick={() => setShowCancel(true)}
                        >
                          Cancelar plano
                        </Button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </>
          )}

          {/* Account info */}
          <Separator />
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
              <User className="h-5 w-5 text-primary" />
              Dados da Conta
            </h2>
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm font-medium text-foreground">{user.email}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Plano</span>
                  <span className="text-sm font-medium text-foreground">
                    {currentPlan?.name || "Nenhum"}
                  </span>
                </div>
                {subscription && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant="outline" className="capitalize">
                        {subscription.status}
                      </Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Upgrade / downgrade modal */}
      {showUpgrade && currentPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg">
            <PlanUpgradeCard
              currentPlan={currentPlan}
              targetPlan={planMap[upgradeTo]}
              isUpgrade={upgradeTo === "pro"}
              prorataMessage={
                upgradeTo === "pro"
                  ? "O upgrade é aplicado imediatamente e a diferença é cobrada de forma proporcional ao período restante."
                  : "O downgrade entra em vigor apenas na próxima renovação. Você mantém o plano atual até lá."
              }
              onConfirm={handleChangePlan}
              onCancel={() => setShowUpgrade(false)}
            />
          </div>
        </div>
      )}

      {/* Cancel flow */}
      <CancelSubscriptionFlow
        open={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirmCancel={handleCancel}
        onDowngrade={
          currentPlanKey === "pro"
            ? () => {
                setShowCancel(false);
                setUpgradeTo("basico");
                setShowUpgrade(true);
              }
            : undefined
        }
        planName={currentPlan?.name}
        accessUntil={
          subscription?.current_period_end
            ? new Date(subscription.current_period_end).toLocaleDateString("pt-BR")
            : undefined
        }
      />

    </>
  );
}
