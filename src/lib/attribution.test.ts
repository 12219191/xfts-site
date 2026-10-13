import { afterEach, beforeEach, describe, expect, it } from "vitest";

type Store = Record<string, string>;

function setupBrowser(url: string, cookie = "", referrer = "") {
  const store: Store = {};
  const u = new URL(url);
  const g = globalThis as Record<string, unknown>;
  g.window = { location: { search: u.search, pathname: u.pathname, origin: u.origin, protocol: u.protocol } };
  g.localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
  };
  // Jar de cookies: atribuir acrescenta/substitui, como no navegador.
  const jar = new Map<string, string>();
  for (const part of cookie.split("; ").filter(Boolean)) {
    const i = part.indexOf("=");
    jar.set(part.slice(0, i), part.slice(i + 1));
  }
  const doc = {
    referrer,
    get cookie() {
      return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    },
    set cookie(v: string) {
      const [pair] = v.split(";");
      const i = pair.indexOf("=");
      jar.set(pair.slice(0, i), pair.slice(i + 1));
    },
  };
  g.document = doc;
  return doc;
}

afterEach(() => {
  const g = globalThis as Record<string, unknown>;
  delete g.window;
  delete g.document;
  delete g.localStorage;
});

describe("attribution: IDs de anúncio", () => {
  beforeEach(() => undefined);

  it("captura gclid, gbraid, wbraid, fbclid e li_fat_id preservando a caixa", async () => {
    setupBrowser("https://x.com/?gbraid=AbC1&wbraid=dEf2&li_fat_id=Uu-1&fbclid=FbX");
    const { captureAttribution, getAttributionPayload } = await import("./attribution");
    captureAttribution();
    const p = getAttributionPayload();
    expect(p).toMatchObject({
      gbraid: "AbC1",
      wbraid: "dEf2",
      li_fat_id: "Uu-1",
      fbclid: "FbX",
      lt_gbraid: "AbC1",
      lt_wbraid: "dEf2",
      lt_li_fat_id: "Uu-1",
    });
  });

  it("monta o fbc a partir do fbclid quando não há cookie", async () => {
    setupBrowser("https://x.com/?fbclid=FbX");
    const { captureAttribution, getAttributionPayload } = await import("./attribution");
    captureAttribution();
    expect(getAttributionPayload().fbc).toMatch(/^fb\.1\.\d+\.FbX$/);
  });

  it("prefere os cookies _fbc/_fbp e usa li_fat_id do cookie se a URL não tiver", async () => {
    setupBrowser("https://x.com/", "_fbc=fb.1.111.abc; _fbp=fb.1.111.222; li_fat_id=cookie-uuid");
    const { captureAttribution, getAttributionPayload } = await import("./attribution");
    captureAttribution();
    expect(getAttributionPayload()).toMatchObject({
      fbc: "fb.1.111.abc",
      fbp: "fb.1.111.222",
      li_fat_id: "cookie-uuid",
      lt_li_fat_id: "cookie-uuid",
    });
  });

  it("buildFbc devolve undefined sem fbclid", async () => {
    const { buildFbc } = await import("./attribution");
    expect(buildFbc(undefined, 1)).toBeUndefined();
    expect(buildFbc("A", 1700000000000)).toBe("fb.1.1700000000000.A");
  });

  it("cookie com percent-encoding inválido não quebra", async () => {
    setupBrowser("https://x.com/", "_fbp=%E0%A4%A");
    const { getAdCookies } = await import("./attribution");
    expect(() => getAdCookies()).not.toThrow();
  });
});
