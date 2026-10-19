import type { ImgHTMLAttributes } from "react";
import { PRODUCT_IMAGE_VARIANTS } from "@/lib/product-image-variants";

/** Only known originals use copies; a replacement never inherits another photo. */
export function ProductImage({ src, sizes = "100vw", ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const variants = src ? PRODUCT_IMAGE_VARIANTS.get(src) : undefined;
  return (
    <img
      {...props}
      src={src}
      srcSet={variants?.map((variant) => `${variant.url} ${variant.width}w`).join(", ")}
      sizes={variants ? sizes : undefined}
    />
  );
}