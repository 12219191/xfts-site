import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import {
  acceptTeamInvite,
  previewInvite,
  type InvitePreview,
} from "@/lib/invites.functions";
import { CheckCircle2, Loader2, MailX } from "lucide-react";

export const Route = createFileRoute("/convite/$token")({
  head: () => ({
    meta: [
      { title: "Convite de equipe — XFTS FLEXUS" },
      {
        name: "description",
        content:
          "Aceite o convite para acessar o sistema FLEXUS contratado pela sua empresa e comece a usar em minutos.",
      },
      { property: "og:title", content: "Convite de equipe — XFTS FLEXUS" },
      {
        property: "og:description",
        content: "Aceite o convite e acesse o sistema FLEXUS da sua empresa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConvitePage,
});

function ConvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [done, setDone] = useState<{ appName: string } | null>(null);

  const load = useCallback(async () => {
    const [preview, session] = await Promise.all([
      previewInvite({ data: { token } }).catch(() => null),
      supabase.auth.getUser(),
    ]);
    setInvite(preview);
    setSignedIn(Boolean(session.data.user));
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => subscription.unsubscribe();
  }, [load]);

  const handleAccept = async () => {
    setAccepting(true);
    const result = await acceptTeamInvite({ data: { token } });
    setAccepting(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setDone({ appName: result.appName });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md border-border">
          <CardContent className="p-8 text-center">
            {loading ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando convite...
              </div>
            ) : done ? (
              <>
                <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
                <h1 className="mt-4 text-xl font-bold text-foreground">Acesso liberado</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Você agora faz parte da equipe no {done.appName}.
                </p>
                <Button
                  className="mt-6 w-full bg-primary text-primary-foreground"
                  onClick={() => navigate({ to: "/minha-conta" })}
                >
                  Ir para minha conta
                </Button>
              </>
            ) : !invite || invite.status !== "pending" ? (
              <>
                <MailX className="mx-auto h-10 w-10 text-muted-foreground" />
                <h1 className="mt-4 text-xl font-bold text-foreground">Convite indisponível</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Este convite já foi usado, cancelado ou expirou. Peça um novo para quem
                  administra a conta da sua empresa.
                </p>
                <Button asChild variant="outline" className="mt-6 w-full">
                  <Link to="/">Voltar ao site</Link>
                </Button>
              </>
            ) : (
              <>
                <h1 className="text-xl font-bold text-foreground">
                  Convite para o {invite.appName}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {invite.titular || "O titular da conta"} convidou{" "}
                  <span className="font-medium text-foreground">{invite.email}</span> para usar o
                  sistema.
                </p>
                {signedIn ? (
                  <Button
                    className="mt-6 w-full bg-primary text-primary-foreground"
                    onClick={handleAccept}
                    disabled={accepting}
                  >
                    {accepting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Aceitar convite"
                    )}
                  </Button>
                ) : (
                  <>
                    <p className="mt-6 text-sm text-muted-foreground">
                      Entre com a conta <span className="font-medium">{invite.email}</span> para
                      aceitar.
                    </p>
                    <Button asChild className="mt-3 w-full bg-primary text-primary-foreground">
                      <Link to="/login" search={{ redirect: `/convite/${token}` }}>
                        Entrar ou criar conta
                      </Link>
                    </Button>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
