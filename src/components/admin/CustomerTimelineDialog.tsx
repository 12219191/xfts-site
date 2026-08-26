import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createCustomerNote,
  deleteCustomerNote,
  getCustomerTimeline,
} from "@/lib/customer-timeline.functions";
import type { CustomerNote, TimelineItem, TimelineKind } from "@/lib/customer-timeline.server";
import {
  CreditCard,
  ExternalLink,
  Mail,
  MessageSquare,
  Pin,
  Receipt,
  RefreshCw,
  Shield,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";

const KIND_META: Record<
  TimelineKind,
  { label: string; icon: typeof Mail }
> = {
  assinatura: { label: "Assinatura", icon: RefreshCw },
  fatura: { label: "Faturas", icon: Receipt },
  cobranca: { label: "Cobrança", icon: CreditCard },
  email: { label: "E-mails", icon: Mail },
  acesso: { label: "Acessos", icon: UserCheck },
  lead: { label: "Leads", icon: Users },
  admin: { label: "Ações internas", icon: Shield },
  nota: { label: "Notas", icon: MessageSquare },
};

const STATUS_CLASS: Record<TimelineItem["status"], string> = {
  ok: "bg-primary/10 text-primary",
  atencao: "bg-amber-500/15 text-amber-600",
  erro: "bg-destructive/10 text-destructive",
  neutro: "bg-muted text-muted-foreground",
};

const fmtDateTime = (v: string) => new Date(v).toLocaleString("pt-BR");

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  email: string;
  environment: string;
}

export function CustomerTimelineDialog({ open, onOpenChange, userId, email, environment }: Props) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [filter, setFilter] = useState<TimelineKind | "todos">("todos");
  const [noteBody, setNoteBody] = useState("");
  const [noteKind, setNoteKind] = useState("nota");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const result = await getCustomerTimeline({ data: { userId, email, environment } });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setItems(result.items);
        setNotes(result.notes);
      }
    } catch {
      toast.error("Falha ao carregar o histórico do cliente.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId, environment]);

  const saveNote = async () => {
    setSaving(true);
    try {
      const result = await createCustomerNote({
        data: { userId, email, body: noteBody, kind: noteKind },
      });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Nota registrada.");
        setNoteBody("");
        load();
      }
    } catch {
      toast.error("Não foi possível salvar a nota.");
    }
    setSaving(false);
  };

  const removeNote = async (noteId: string) => {
    const result = await deleteCustomerNote({ data: { noteId, userId } });
    if ("error" in result) toast.error(result.error);
    else {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast.success("Nota removida.");
    }
  };

  const visible = filter === "todos" ? items : items.filter((i) => i.kind === filter);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico do cliente</DialogTitle>
          <DialogDescription>
            {email} · ambiente {environment === "live" ? "produção" : "testes"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-medium text-foreground">Nota interna</p>
            <Textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Resumo do atendimento, combinado com o cliente, próximo passo…"
              className="mt-2 min-h-20"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Input
                value={noteKind}
                onChange={(e) => setNoteKind(e.target.value)}
                placeholder="Tipo (nota, ligação, e-mail, reunião)"
                className="h-9 max-w-56"
              />
              <Button size="sm" onClick={saveNote} disabled={saving || noteBody.trim().length < 3}>
                Salvar nota
              </Button>
              <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
                <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
              </Button>
            </div>
          </div>

          {notes.length > 0 && (
            <div className="space-y-2">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3"
                >
                  <div>
                    <p className="text-sm text-foreground">{note.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {note.pinned && <Pin className="mr-1 inline h-3 w-3" />}
                      {note.kind} · {note.authorEmail ?? "equipe"} · {fmtDateTime(note.createdAt)}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeNote(note.id)}
                    aria-label="Remover nota"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1">
            {(["todos", ...(Object.keys(KIND_META) as TimelineKind[])] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key as TimelineKind | "todos")}
                className={`rounded-md px-2.5 py-1 text-xs ${
                  filter === key
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {key === "todos" ? "Tudo" : KIND_META[key as TimelineKind].label}
              </button>
            ))}
          </div>

          {loading && <p className="text-sm text-muted-foreground">Carregando histórico…</p>}
          {!loading && visible.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum evento neste filtro.</p>
          )}

          <ol className="space-y-2">
            {visible.map((item) => {
              const Icon = KIND_META[item.kind].icon;
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border border-border p-3"
                >
                  <span className={`mt-0.5 rounded-md p-1.5 ${STATUS_CLASS[item.status]}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{item.title}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {KIND_META[item.kind].label}
                      </Badge>
                    </div>
                    {item.detail && (
                      <p className="text-xs text-muted-foreground">{item.detail}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{fmtDateTime(item.at)}</p>
                  </div>
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary"
                      aria-label="Abrir no Stripe"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  );
}
