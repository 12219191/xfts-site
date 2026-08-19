/**
 * Compressão e conversão para WebP no navegador (antes do upload).
 * Reduz o peso das imagens e melhora o LCP das páginas de produto.
 */

export interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface OptimizedImage {
  file: File;
  originalSize: number;
  size: number;
  width: number;
  height: number;
  converted: boolean;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem"));
    };
    img.src = url;
  });
}

export async function optimizeImage(
  file: File,
  { maxWidth = 1920, maxHeight = 1920, quality = 0.82 }: OptimizeOptions = {},
): Promise<OptimizedImage> {
  const fallback: OptimizedImage = {
    file,
    originalSize: file.size,
    size: file.size,
    width: 0,
    height: 0,
    converted: false,
  };

  // GIFs animados e SVGs não devem passar pelo canvas.
  if (typeof document === "undefined" || file.type === "image/gif" || file.type === "image/svg+xml") {
    return fallback;
  }

  try {
    const img = await loadImage(file);
    const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
    const width = Math.round(img.width * ratio);
    const height = Math.round(img.height * ratio);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return fallback;
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );

    // Navegador sem suporte a WebP ou resultado maior que o original.
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) {
      return { ...fallback, width: img.width, height: img.height };
    }

    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return {
      file: new File([blob], name, { type: "image/webp" }),
      originalSize: file.size,
      size: blob.size,
      width,
      height,
      converted: true,
    };
  } catch {
    return fallback;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Sugere um alt text a partir do nome do arquivo enviado. */
export function altFromFileName(fileName: string): string {
  const base = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!base) return "";
  return base.charAt(0).toUpperCase() + base.slice(1);
}
