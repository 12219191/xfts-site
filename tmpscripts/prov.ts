import { provisionApp } from "../src/lib/provisioning.server";
for (const priceId of ["gestao_barbearias_pro_mensal", "flexus_crm_pro_mensal", "flexus_casa360_pro_mensal"]) {
  const r = await provisionApp({ event: "created", userId: "2f04e8f3-bf7d-4d18-aa2a-2179d7dccce0", priceId, status: "active", accessUntil: null, environment: "sandbox" });
  console.log(priceId, "->", JSON.stringify(r));
}
