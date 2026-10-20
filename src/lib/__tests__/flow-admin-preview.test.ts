import { describe, it, expect } from "vitest";
import { flowAdminPreviewAllowed } from "../flow-admin-preview";

const base = { appKey: "flow", productAccessible: false, flagOn: true, isAdmin: true };

describe("flowAdminPreviewAllowed", () => {
  it("admin com flag ligada acessa o Flow em breve", () => expect(flowAdminPreviewAllowed(base)).toBe(true));
  it("cliente comum continua bloqueado", () => expect(flowAdminPreviewAllowed({ ...base, isAdmin: false })).toBe(false));
  it("flag desligada desfaz a liberação", () => expect(flowAdminPreviewAllowed({ ...base, flagOn: false })).toBe(false));
  it("não vale para outros produtos", () => expect(flowAdminPreviewAllowed({ ...base, appKey: "estetica" })).toBe(false));
});
