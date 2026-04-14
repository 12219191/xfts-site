import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionStatus } from "@/components/SubscriptionStatus";
import { PlanUpgradeCard } from "@/components/PlanUpgradeCard";
import { CancelSubscriptionFlow } from "@/components/CancelSubscriptionFlow";
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
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [upgradeTo, setUpgradeTo] = useState<"pro" | "enterprise">("pro");

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

      const env = getStripeEnvironment() === "live" ? "live" : "sandbox";
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", authUser.id)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) setSubscription(data as SubscriptionRow);
      setLoading(false);
    }
    load();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
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
          {/* Subscription status */}
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
              <CreditCard className="h-5 w-5 text-primary" />
              Sua Assinatura
            </h2>

            {subscription && currentPlan ? (
              <SubscriptionStatus
                status={subscription.status as "active" | "trialing" | "past_due" | "canceled" | "incomplete" | "unpaid" | "paused"}
                currentPeriodEnd={subscription.current_period_end}
                cancelAtPeriodEnd={subscription.cancel_at_period_end}
                productName="FLEXUS"
                planTier={currentPlan.tier}
              />
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
                  {/* Upgrade options */}
                  {currentPlanKey !== "pro" && (
                    <Card
                      className="cursor-pointer border-cta/30 transition-all hover:border-cta hover:shadow-md"
                      onClick={() => {
                        setUpgradeTo("pro");
                        setShowUpgrade(true);
                      }}
                    >
                      <CardContent className="flex items-center gap-4 p-5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cta/10">
                          <ArrowUpRight className="h-5 w-5 text-cta" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">Upgrade para Pro</p>
                          <p className="text-xs text-muted-foreground">
                            Desbloqueie financeiro, notificações e relatórios avançados.
                          </p>
                        </div>
                        <Badge className="ml-auto bg-cta/10 text-cta border-0">
                          Popular
                        </Badge>
                      </CardContent>
                    </Card>
                  )}

                  {currentPlanKey !== "enterprise" && (
                    <Card
                      className="cursor-pointer border-amber-500/30 transition-all hover:border-amber-500 hover:shadow-md"
                      onClick={() => {
                        setUpgradeTo("enterprise");
                        setShowUpgrade(true);
                      }}
                    >
                      <CardContent className="flex items-center gap-4 p-5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                          <Shield className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">Upgrade para Enterprise</p>
                          <p className="text-xs text-muted-foreground">
                            API, multi-unidades e suporte 24/7.
                          </p>
                        </div>
                        <Badge className="ml-auto bg-amber-500/10 text-amber-600 border-0">
                          Premium
                        </Badge>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Cancel */}
                {subscription.status !== "canceled" && (
                  <div className="mt-6 rounded-xl border border-border bg-muted/20 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Cancelar assinatura</p>
                        <p className="text-xs text-muted-foreground">
                          Você pode cancelar a qualquer momento.
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

      {/* Upgrade modal */}
      {showUpgrade && currentPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg">
            <PlanUpgradeCard
              currentPlan={currentPlan}
              targetPlan={planMap[upgradeTo]}
              isUpgrade={true}
              prorataMessage="O valor será ajustado proporcionalmente ao período restante da sua assinatura atual."
              onConfirm={() => {
                setShowUpgrade(false);
                window.location.href = `/checkout?plan=${upgradeTo}`;
              }}
              onCancel={() => setShowUpgrade(false)}
            />
          </div>
        </div>
      )}

      {/* Cancel flow */}
      <CancelSubscriptionFlow
        open={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirmCancel={(reason) => {
          setShowCancel(false);
          console.log("Cancel reason:", reason);
        }}
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
