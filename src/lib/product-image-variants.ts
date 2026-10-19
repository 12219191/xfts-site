import image0_480 from "@/assets/product-responsive/hero-aba-480.webp.asset.json";
import image0_960 from "@/assets/product-responsive/hero-aba-960.webp.asset.json";
import image0_1600 from "@/assets/product-responsive/hero-aba-1600.webp.asset.json";
import image1_480 from "@/assets/product-responsive/hero-aesthetics-480.webp.asset.json";
import image1_960 from "@/assets/product-responsive/hero-aesthetics-960.webp.asset.json";
import image1_1600 from "@/assets/product-responsive/hero-aesthetics-1600.webp.asset.json";
import image2_480 from "@/assets/product-responsive/hero-barbershop-480.webp.asset.json";
import image2_960 from "@/assets/product-responsive/hero-barbershop-960.webp.asset.json";
import image2_1600 from "@/assets/product-responsive/hero-barbershop-1600.webp.asset.json";
import image3_480 from "@/assets/product-responsive/hero-casa360-480.webp.asset.json";
import image3_960 from "@/assets/product-responsive/hero-casa360-960.webp.asset.json";
import image3_1600 from "@/assets/product-responsive/hero-casa360-1600.webp.asset.json";
import image4_480 from "@/assets/product-responsive/hero-clinic-480.webp.asset.json";
import image4_960 from "@/assets/product-responsive/hero-clinic-960.webp.asset.json";
import image4_1600 from "@/assets/product-responsive/hero-clinic-1600.webp.asset.json";
import image5_480 from "@/assets/product-responsive/hero-crm-480.webp.asset.json";
import image5_960 from "@/assets/product-responsive/hero-crm-960.webp.asset.json";
import image5_1600 from "@/assets/product-responsive/hero-crm-1600.webp.asset.json";
import image6_480 from "@/assets/product-responsive/hero-atende-480.webp.asset.json";
import image6_960 from "@/assets/product-responsive/hero-atende-960.webp.asset.json";
import image6_1536 from "@/assets/product-responsive/hero-atende-1536.webp.asset.json";
import image7_480 from "@/assets/product-responsive/hero-estetica-current-480.webp.asset.json";
import image7_960 from "@/assets/product-responsive/hero-estetica-current-960.webp.asset.json";
import image7_1600 from "@/assets/product-responsive/hero-estetica-current-1600.webp.asset.json";
import heroAtende from "@/assets/hero-atende.jpg";

/** Exact source match: new uploads always keep their own original image. */
export const PRODUCT_IMAGE_VARIANTS = new Map<string, { width: number; url: string }[]>([
  ["/__l5e/assets-v1/f99831b2-a06a-4cf4-a0d2-03b88f80e8f4/hero-aba.webp", [{ width: 480, url: image0_480.url }, { width: 960, url: image0_960.url }, { width: 1600, url: image0_1600.url }]],
  ["/__l5e/assets-v1/abe79f13-179d-4a6c-befa-9d0802ee8095/hero-aesthetics.webp", [{ width: 480, url: image1_480.url }, { width: 960, url: image1_960.url }, { width: 1600, url: image1_1600.url }]],
  ["/__l5e/assets-v1/70dea760-b83a-40c2-b504-e58ccc500a2d/hero-barbershop.webp", [{ width: 480, url: image2_480.url }, { width: 960, url: image2_960.url }, { width: 1600, url: image2_1600.url }]],
  ["/__l5e/assets-v1/3c7274df-56b9-4560-bf02-59dd9f86a6b2/hero-casa360.webp", [{ width: 480, url: image3_480.url }, { width: 960, url: image3_960.url }, { width: 1600, url: image3_1600.url }]],
  ["/__l5e/assets-v1/6a8ec980-5b1d-4029-ab54-93e3e1a01a0f/hero-clinic.webp", [{ width: 480, url: image4_480.url }, { width: 960, url: image4_960.url }, { width: 1600, url: image4_1600.url }]],
  ["/__l5e/assets-v1/7347cd1b-136c-43fd-b356-13f5a7cc59de/hero-crm.webp", [{ width: 480, url: image5_480.url }, { width: 960, url: image5_960.url }, { width: 1600, url: image5_1600.url }]],
  [heroAtende, [{ width: 480, url: image6_480.url }, { width: 960, url: image6_960.url }, { width: 1536, url: image6_1536.url }]],
  ["/assets/hero-atende-BmlMFlOC.jpg", [{ width: 480, url: image6_480.url }, { width: 960, url: image6_960.url }, { width: 1536, url: image6_1536.url }]],
  ["https://xfts-flexus.com/api/public/blog-image/2026/7a4c345f-127e-4ea7-ac5c-d6aa05776f1b.webp", [{ width: 480, url: image7_480.url }, { width: 960, url: image7_960.url }, { width: 1600, url: image7_1600.url }]],
]);
