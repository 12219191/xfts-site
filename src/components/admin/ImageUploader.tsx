import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { ImagePlus, Loader2, Link2, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { optimizeImage, formatBytes, altFromFileName } from "@/lib/image-optimize";

const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface Props {
  value: string;
  onChange: (url: string) => void;
  /** Recebe uma sugestão de alt text derivada do nome do arquivo enviado. */
  onAltSuggestion?: (alt: string) => void;
  /** Texto alternativo usado na pré-visualização. */
  previewAlt?: string;
}

function buildPublicUrl(path: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/api/public/blog-image/${path}`;
}

export function ImageUploader({ value, onChange, onAltSuggestion, previewAlt }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showUrlField, setShowUrlField] = useState(false);

  const upload = async (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Formato inválido", { description: "Use JPG, PNG, WebP ou GIF." });
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Imagem muito grande", { description: "O limite é 5 MB." });
      return;
    }

    setUploading(true);
    const optimized = await optimizeImage(file, { maxWidth: 1920, quality: 0.82 });
    const upFile = optimized.file;
    const ext = upFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("blog-images")
      .upload(path, upFile, { cacheControl: "31536000", contentType: upFile.type });

    setUploading(false);

    if (error) {
      toast.error("Falha ao enviar a imagem", { description: error.message });
      return;
    }

    onChange(buildPublicUrl(path));
    onAltSuggestion?.(altFromFileName(file.name));

    if (optimized.converted) {
      const saved = Math.round((1 - optimized.size / optimized.originalSize) * 100);
      toast.success("Imagem enviada e otimizada", {
        description: `WebP ${optimized.width}×${optimized.height} — ${formatBytes(optimized.originalSize)} → ${formatBytes(optimized.size)} (-${saved}%)`,
      });
    } else {
      toast.success("Imagem enviada com sucesso");
    }
  };

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) void upload(file);
  };

  return (
    <div className="space-y-3">
      {value ? (
        <div className="group relative overflow-hidden rounded-lg border border-border">
          <img
            src={value}
            alt={previewAlt || "Pré-visualização da imagem"}
            className="aspect-video w-full object-cover"
          />
          <div className="flex items-center justify-between gap-2 border-t border-border bg-card px-3 py-2">
            <span className="truncate text-xs text-muted-foreground">
              Convertida para WebP no envio
            </span>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => inputRef.current?.click()}
              >
                Trocar
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                onClick={() => onChange("")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          )}
          <span className="text-sm font-medium text-foreground">
            {uploading ? "Enviando imagem..." : "Arraste a foto aqui ou clique para escolher"}
          </span>
          <span className="text-xs text-muted-foreground">
            JPG, PNG, WebP ou GIF — até 5 MB (convertida para WebP)
          </span>
        </button>
      )}

      {!value && !uploading && (
        <p className="flex items-center gap-1.5 text-xs text-gold-deep">
          <AlertTriangle className="h-3 w-3" /> Artigo sem foto de capa
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {showUrlField ? (
        <Input
          placeholder="https://..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowUrlField(true)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Link2 className="h-3 w-3" /> Usar URL externa
        </button>
      )}
    </div>
  );
}
