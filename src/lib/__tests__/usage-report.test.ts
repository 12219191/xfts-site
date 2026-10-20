import { describe, it, expect } from "vitest";
import { parseUsageReport, shouldStore } from "../usage-report";

const now = Date.parse("2026-10-20T22:00:00Z");
const base = { user_id: "f654ced0-0000-4000-8000-000000000000", usuarios_em_uso: 3, timestamp: "2026-10-20T22:00:00Z" };

describe("parseUsageReport", () => {
  it("aceita corpo válido", () => expect(parseUsageReport(base, now).ok).toBe(true));
  it("recusa negativo", () => expect(parseUsageReport({ ...base, usuarios_em_uso: -1 }, now).ok).toBe(false));
  it("recusa não inteiro", () => expect(parseUsageReport({ ...base, usuarios_em_uso: 1.5 }, now).ok).toBe(false));
  it("recusa acima de 100000", () => expect(parseUsageReport({ ...base, usuarios_em_uso: 100001 }, now).ok).toBe(false));
  it("recusa timestamp com mais de 10 min", () =>
    expect(parseUsageReport({ ...base, timestamp: "2026-10-20T21:49:00Z" }, now).ok).toBe(false));
  it("recusa campos extras (nenhum dado do cliente além do número)", () =>
    expect(parseUsageReport({ ...base, email: "x@y.com" }, now).ok).toBe(false));
});

describe("shouldStore (última escrita vence)", () => {
  it("ignora timestamp mais antigo", () => expect(shouldStore(Date.parse("2026-10-20T21:59:00Z"), "2026-10-20T22:00:00Z")).toBe(false));
  it("repetição idêntica grava sem efeito colateral", () => expect(shouldStore(now, "2026-10-20T22:00:00.000Z")).toBe(true));
  it("primeira escrita grava", () => expect(shouldStore(now, null)).toBe(true));
});
