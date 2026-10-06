import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
  appKeyFromPriceId,
  billingIntervalFromPriceId,
  getFlexusApp,
  planTierFromPriceId,
  seatsFromPriceId,
  seatsLabel,
} from "@/lib/flexus-apps";
import { PLANS_BY_APP, type ProductPlan } from "@/lib/product-plans";
import { getPublicCatalog } from "@/lib/catalog.functions";
import { plansForProduct } from "@/lib/catalog";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionStatus } from "@/components/SubscriptionStatus";
import { SubscriptionSummary } from "@/components/SubscriptionSummary";
import { PlanSyncIndicator } from "@/components/PlanSyncIndicator";
import { InvoicesSection } from "@/components/InvoicesSection";
import { PlanUpgradeCard } from "@/components/PlanUpgradeCard";
import { CancelSubscriptionFlow } from "@/components/CancelSubscriptionFlow";
import { MeusSistemas, type SistemaSubscription } from "@/components/MeusSistemas";
import { MeusRecursos } from "@/components/MeusRecursos";
import { TeamInvites } from "@/components/TeamInvites";

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
  loader: async () => ({ catalog: await getPublicCatalog() }),
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
  stripe_subscription_id: string;
  seats_used: number | null;
  status: string;
  product_id: string;
  price_id: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  environment: string;
  created_at: string | null;
}

type TierKey = "basico" | "pro" | "enterprise";

/**
 * Nível do plano a partir do lookup key do preço (ex.: flexus_crm_basico_mensal).
 * Nunca usar `product_id`: ele guarda o id interno do provedor (prod_xxx),
 * que contém "pro" em todo registro real.
 */
function tierKeyFromPriceId(priceId: string | null | undefined): TierKey {
  const lower = (priceId ?? "").toLowerCase();
  if (lower.includes("enterprise")) return "enterprise";
  if (lower.includes("_pro_") || lower.endsWith("_pro")) return "pro";
  return "basico";
}


function MinhaContaPage() {
  const { catalog } = Route.useLoaderData();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [allSubscriptions, setAllSubscriptions] = useState<SistemaSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [upgradeTo, setUpgradeTo] = useState<TierKey>("pro");
  /** Estado de sincronização do plano com o provedor de pagamento. */
  const [syncState, setSyncState] = useState<"active" | "syncing" | "processing" | "error">(
    "active",
  );
  const [syncError, setSyncError] = useState<string | null>(null);
  /** Mudança de plano aguardando confirmação no banco. */
  const [pendingChange, setPendingChange] = useState<{ subId: string; priceId: string } | null>(
    null,
  );
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);


  const env: StripeEnv = getStripeEnvironment() === "live" ? "live" : "sandbox";

  /** Assinatura atualmente selecionada — o usuário pode assinar vários sistemas. */
  const subscription =
    subscriptions.find((s) => s.stripe_subscription_id === selectedSubId) ??
    subscriptions[0] ??
    null;
  const subscriptionId = subscription?.stripe_subscription_id;
  const systemName = subscription
    ? getFlexusApp(appKeyFromPriceId(subscription.price_id) ?? "")?.name ?? "FLEXUS"
    : "FLEXUS";

  /** Mudança pendente acessível dentro dos callbacks sem recriá-los. */
  const pendingRef = useRef<{ subId: string; priceId: string } | null>(null);
  pendingRef.current = pendingChange;

  const fetchSubscription = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        // Cortesias não pertencem a um ambiente de pagamento: valem em ambos.
        .or(`environment.eq.${env},is_courtesy.is.true`)
        .order("created_at", { ascending: false });

      if (error) {
        setSyncState("error");
        setSyncError("Não foi possível consultar sua assinatura agora. Tentaremos de novo em instantes.");
        return [];
      }

      const rows = (data as SubscriptionRow[]) ?? [];
      setLastSyncAt(new Date());

      const pending = pendingRef.current;
      if (pending) {
        const row = rows.find((r) => r.stripe_subscription_id === pending.subId);
        if (row?.price_id === pending.priceId) {
          setPendingChange(null);
          pendingRef.current = null;
          setSyncState("active");
          setSyncError(null);
        }
      } else {
        setSyncState((prev) => (prev === "error" ? "active" : prev));
        setSyncError(null);
      }

      // Enquanto o banco não confirma, mantemos o plano novo visível.
      const shown = pendingRef.current
        ? rows.map((r) =>
            r.stripe_subscription_id === pendingRef.current!.subId
              ? { ...r, price_id: pendingRef.current!.priceId }
              : r,
          )
        : rows;

      setSubscriptions(shown);
      setSelectedSubId((prev) =>
        prev && shown.some((r) => r.stripe_subscription_id === prev)
          ? prev
          : shown[0]?.stripe_subscription_id ?? null,
      );
      setAllSubscriptions(
        shown.map((r) => ({
          price_id: r.price_id,
          status: r.status,
          current_period_end: r.current_period_end,
          cancel_at_period_end: r.cancel_at_period_end,
        })),
      );
      return rows;
    },
    [env],
  );

  /**
   * A troca de plano é confirmada pelo provedor de pagamento por webhook, que
   * chega alguns segundos depois. Atualizamos o plano na tela na hora e
   * seguimos consultando até o banco confirmar, para nunca exibir o plano antigo.
   */
  const confirmPlanChange = useCallback(
    async (userId: string, subId: string, appliedPriceId: string) => {
      setPendingChange({ subId, priceId: appliedPriceId });
      pendingRef.current = { subId, priceId: appliedPriceId };
      setSyncState("syncing");
      setSyncError(null);
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.stripe_subscription_id === subId ? { ...s, price_id: appliedPriceId } : s,
        ),
      );

      for (const delay of [2000, 4000, 8000]) {
        await new Promise((r) => setTimeout(r, delay));
        const rows = await fetchSubscription(userId);
        const row = rows.find((r) => r.stripe_subscription_id === subId);
        if (row?.price_id === appliedPriceId) return;
      }

      // Sem confirmação após as tentativas: a reconciliação periódica assume.
      if (pendingRef.current) setSyncState("processing");
    },
    [fetchSubscription],
  );


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

  /**
   * Reconciliação periódica: mesmo sem webhook confirmado, a página volta a
   * consultar o banco (rápido enquanto há mudança pendente, devagar no resto
   * do tempo) para o card de usuários nunca ficar preso no plano antigo.
   */
  useEffect(() => {
    if (!user) return;
    const interval = pendingChange || syncState === "error" ? 10000 : 60000;
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void fetchSubscription(user.id);
    }, interval);
    return () => clearInterval(id);
  }, [user, pendingChange, syncState, fetchSubscription]);


  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  /** Planos do catálogo do sistema da assinatura selecionada. */
  const currentAppKey = appKeyFromPriceId(subscription?.price_id) ?? "";
  const plansForCurrentApp: ProductPlan[] = currentAppKey
    ? plansForProduct(catalog, currentAppKey).length > 0
      ? plansForProduct(catalog, currentAppKey)
      : (PLANS_BY_APP[currentAppKey] ?? [])
    : [];

  /** Lookup key do plano de destino, respeitando o ciclo (mensal/anual). */
  const targetPriceId = (target: TierKey) => {
    const plan = plansForCurrentApp.find((p) => p.tier === target);
    if (!plan) return "";
    return billingIntervalFromPriceId(subscription?.price_id) === "anual"
      ? plan.annualPriceId ?? plan.priceId ?? ""
      : plan.priceId ?? "";
  };


  const runAction = async (fn: () => Promise<{ ok?: true; message?: string; error?: string }>) => {
    setActionLoading(true);
    try {
      const result = await fn();
      if (result.error) {
        toast.error(result.error);
        setSyncState("error");
        setSyncError(result.error);
        return false;
      }
      toast.success(result.message ?? "Tudo certo!");
      setSyncError(null);
      setSyncState("active");
      if (user) await fetchSubscription(user.id);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível concluir a operação.";
      toast.error(msg);
      setSyncState("error");
      setSyncError(msg);
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
          subscriptionId,
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
    await runAction(() => cancelSubscription({ data: { environment: env, subscriptionId, reason } }));
  };

  const handleReactivate = async () => {
    await runAction(() => reactivateSubscription({ data: { environment: env, subscriptionId } }));
  };

  const handleChangePlan = async () => {
    const target = targetPriceId(upgradeTo);
    if (!target || !subscriptionId) return;
    setShowUpgrade(false);
    setActionLoading(true);
    setSyncState("syncing");
    setSyncError(null);
    try {
      const result = await changePlan({
        data: { environment: env, subscriptionId, targetPriceId: target },
      });
      if ("error" in result) {
        toast.error(result.error);
        setSyncState("error");
        setSyncError(result.error);
        return;
      }
      toast.success(result.message);
      if (user) {
        if (result.applied === "immediate" && result.appliedPriceId) {
          await confirmPlanChange(user.id, subscriptionId, result.appliedPriceId);
        } else {
          // Downgrade agendado: nada muda agora, o plano atual segue ativo.
          setSyncState("active");
          await fetchSubscription(user.id);

        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível concluir a operação.";
      toast.error(msg);
      setSyncState("error");
      setSyncError(msg);
    } finally {
      setActionLoading(false);
    }

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

  const currentPlanKey: TierKey | null = subscription
    ? tierKeyFromPriceId(subscription.price_id)
    : null;
  const interval = billingIntervalFromPriceId(subscription?.price_id);
  const planInfo = (tier: TierKey) => {
    const plan = plansForCurrentApp.find((p) => p.tier === tier);
    if (!plan) return null;
    return {
      name: plan.name,
      price: interval === "anual" ? plan.annualPrice ?? plan.price : plan.price,
      features: plan.features,
      tier: plan.name,
    };
  };
  const currentPlan = currentPlanKey ? planInfo(currentPlanKey) : null;

  const TIER_ORDER: TierKey[] = ["basico", "pro", "enterprise"];
  /** Trocas possíveis dentro do mesmo sistema (só planos com preço cadastrado). */
  const changeOptions = currentPlanKey
    ? plansForCurrentApp
        .filter(
          (p) =>
            p.tier !== currentPlanKey &&
            (interval === "anual" ? p.annualPriceId ?? p.priceId : p.priceId),
        )
        .map((p) => ({
          tier: p.tier as TierKey,
          name: p.name,
          isUpgrade: TIER_ORDER.indexOf(p.tier as TierKey) > TIER_ORDER.indexOf(currentPlanKey),
        }))
    : [];
  const upgradeOption = changeOptions.find((o) => o.isUpgrade);
  const changeIsUpgrade =
    TIER_ORDER.indexOf(upgradeTo) > TIER_ORDER.indexOf(currentPlanKey ?? "basico");




  const hasRealBilling = isRealStripeId(subscription?.stripe_customer_id, "cus_");
  const isCourtesy = Boolean(
    (subscription as { is_courtesy?: boolean } | null)?.is_courtesy,
  );
  const courtesyUntil = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("pt-BR")
    : null;

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
          <MeusSistemas subscriptions={allSubscriptions} products={catalog.products} />

          <Separator />

          <MeusRecursos />

          <Separator />

          <TeamInvites />

          <Separator />


          {/* Subscription status */}
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
              <CreditCard className="h-5 w-5 text-primary" />
              Sua Assinatura
            </h2>

            {subscriptions.length > 1 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {subscriptions.map((s) => {
                  const name =
                    getFlexusApp(appKeyFromPriceId(s.price_id) ?? "")?.name ?? s.price_id;
                  const active = s.stripe_subscription_id === subscriptionId;
                  return (
                    <Button
                      key={s.id}
                      size="sm"
                      variant={active ? "default" : "outline"}
                      onClick={() => setSelectedSubId(s.stripe_subscription_id)}
                    >
                      {name}
                      <span className="ml-2 text-xs opacity-70">
                        {planTierFromPriceId(s.price_id)}
                      </span>
                    </Button>
                  );
                })}
              </div>
            )}

            {subscription && currentPlan ? (
              <div className="space-y-4">
                <PlanSyncIndicator
                  state={syncState}
                  error={syncError}
                  lastSyncAt={lastSyncAt}
                  refreshing={refreshing}
                  onRefresh={async () => {
                    if (!user) return;
                    setRefreshing(true);
                    await fetchSubscription(user.id);
                    setRefreshing(false);
                  }}
                />
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
                  productName={systemName}
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
                  {hasRealBilling &&
                    changeOptions.map((opt) => (
                      <Card
                        key={opt.tier}
                        className={
                          opt.isUpgrade
                            ? "cursor-pointer border-cta/30 transition-all hover:border-cta hover:shadow-md"
                            : "cursor-pointer border-border transition-all hover:border-primary hover:shadow-md"
                        }
                        onClick={() => {
                          setUpgradeTo(opt.tier);
                          setShowUpgrade(true);
                        }}
                      >
                        <CardContent className="flex items-center gap-4 p-5">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                              opt.isUpgrade ? "bg-primary/10" : "bg-muted"
                            }`}
                          >
                            {opt.isUpgrade ? (
                              <ArrowUpRight className="h-5 w-5 text-primary" />
                            ) : (
                              <Settings className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">
                              {opt.isUpgrade
                                ? `Upgrade para ${opt.name}`
                                : `Mudar para ${opt.name}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {opt.isUpgrade
                                ? "Imediato, com cobrança proporcional ao período restante."
                                : "Entra em vigor apenas na próxima renovação."}
                            </p>
                          </div>
                          {opt.isUpgrade && (
                            <Badge className="ml-auto bg-primary/10 text-primary border-0">
                              Recomendado
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}


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
                        {seatsFromPriceId(subscription.price_id) === null
                          ? `Usuários ilimitados no plano ${planTierFromPriceId(subscription.price_id)} (${billingIntervalFromPriceId(subscription.price_id)}).`
                          : `${seatsLabel(seatsFromPriceId(subscription.price_id))} inclusos no plano ${planTierFromPriceId(subscription.price_id)} (${billingIntervalFromPriceId(subscription.price_id)}).`}{" "}
                        {subscription.seats_used !== null
                          ? `Em uso hoje: ${subscription.seats_used}.`
                          : `O ${systemName} ainda não informou quantos usuários estão ativos.`}{" "}
                        {upgradeOption
                          ? `Para liberar mais usuários, faça upgrade para o ${upgradeOption.name}.`
                          : "Este é o plano com o maior limite de usuários disponível."}
                      </p>

                    </div>
                    {hasRealBilling && upgradeOption && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setUpgradeTo(upgradeOption.tier);
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
                ) : isCourtesy ? (
                  <div className="mt-4 rounded-xl border border-gold-deep/40 bg-gold/5 p-5 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Acesso cortesia{courtesyUntil ? ` — válido até ${courtesyUntil}` : ""}
                    </span>
                    <p className="mt-1">
                      Não há cobrança nesta assinatura. Para continuar após esse prazo,
                      escolha um plano na página do produto ou fale com a nossa equipe.
                    </p>
                  </div>
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

          {hasRealBilling && (
            <>
              <Separator />
              <InvoicesSection environment={env} subscriptionId={subscriptionId} />
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
              targetPlan={planInfo(upgradeTo) ?? currentPlan}
              isUpgrade={changeIsUpgrade}
              prorataMessage={
                changeIsUpgrade
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
          currentPlanKey && currentPlanKey !== "basico" && changeOptions.some((o) => !o.isUpgrade)
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
