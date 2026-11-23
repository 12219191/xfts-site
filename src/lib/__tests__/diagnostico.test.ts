import { describe, expect, it } from "vitest";
import { diagnosticoUrl } from "@/lib/diagnostico";

const UTM = "utm_source=site&utm_medium=botao&utm_campaign=diagnostico-maturidade";

describe("diagnosticoUrl", () => {
  it("página de produto aponta para o diagnóstico de cada produto", () => {
    expect(diagnosticoUrl("estetica", "pagina")).toBe(
      `https://diagnostico.xfts-flexus.com/?${UTM}&utm_content=pagina-estetica`,
    );
    expect(diagnosticoUrl("barbearia", "pagina")).toBe(
      `https://diagnostico2.xfts-flexus.com/?${UTM}&utm_content=pagina-barbearia`,
    );
  });

  it("rodapé e blog trocam só o utm_content", () => {
    expect(diagnosticoUrl("estetica", "rodape")).toBe(
      `https://diagnostico.xfts-flexus.com/?${UTM}&utm_content=rodape-estetica`,
    );
    expect(diagnosticoUrl("barbearia", "rodape")).toBe(
      `https://diagnostico2.xfts-flexus.com/?${UTM}&utm_content=rodape-barbearia`,
    );
    expect(diagnosticoUrl("estetica", "blog")).toBe(
      `https://diagnostico.xfts-flexus.com/?${UTM}&utm_content=blog-estetica`,
    );
    expect(diagnosticoUrl("barbearia", "blog")).toBe(
      `https://diagnostico2.xfts-flexus.com/?${UTM}&utm_content=blog-barbearia`,
    );
  });
});
