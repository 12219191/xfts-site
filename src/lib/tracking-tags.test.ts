import { describe, expect, it } from "vitest";
import { buildHeadScripts, buildNoscriptTags, readTagIds } from "./tracking-tags";

describe("tracking-tags", () => {
  it("sem IDs não carrega nenhuma tag", () => {
    const ids = readTagIds({});
    expect(buildHeadScripts(ids)).toEqual([]);
    expect(buildNoscriptTags(ids)).toEqual([]);
  });

  it("descarta IDs de exemplo e valores malformados (evita injeção em script)", () => {
    const ids = readTagIds({
      VITE_GTM_ID: "GTM-XXXXXXX'; alert(1);//",
      VITE_GA4_ID: "G-",
      VITE_META_PIXEL_ID: "abc",
      VITE_LINKEDIN_PARTNER_ID: '1"; x',
    });
    expect(ids).toEqual({ gtm: undefined, ga4: undefined, metaPixel: undefined, linkedinPartner: undefined });
  });

  it("monta as tags só dos IDs informados, incluindo LinkedIn", () => {
    const ids = readTagIds({
      VITE_GTM_ID: "GTM-ABC1234",
      VITE_GA4_ID: "G-ABCD123456",
      VITE_META_PIXEL_ID: "123456789012345",
      VITE_LINKEDIN_PARTNER_ID: "1234567",
    });
    const scripts = buildHeadScripts(ids);
    const all = scripts.map((s) => s.children ?? s.src).join("\n");
    expect(all).toContain("'GTM-ABC1234'");
    expect(all).toContain("gtag/js?id=G-ABCD123456");
    expect(all).toContain("fbq('init', '123456789012345')");
    expect(all).toContain('_linkedin_partner_id = "1234567"');
    expect(all).not.toContain("XXXX");
    expect(buildNoscriptTags(ids)).toHaveLength(3);
  });

  it("carrega só o LinkedIn quando é o único ID", () => {
    const ids = readTagIds({ VITE_LINKEDIN_PARTNER_ID: "7654321" });
    expect(buildHeadScripts(ids)).toHaveLength(1);
    expect(buildNoscriptTags(ids)).toEqual([
      { kind: "img", src: "https://px.ads.linkedin.com/collect/?pid=7654321&fmt=gif" },
    ]);
  });
});
