import { describe, expect, it } from "vitest";
import { loadTestCatalog } from "./game.js";
import { ROLE_HANDLERS } from "../../src/roles/registry.js";

describe("helpers de prueba", () => {
  it("el catálogo de prueba tiene los 50 roles y los umbrales", () => {
    const c = loadTestCatalog();
    expect(c.roles.size).toBe(50);
    expect(c.votingThresholds.get(15)).toBe(8);
  });

  it("la prioridad de cada handler coincide con el catálogo", () => {
    const c = loadTestCatalog();
    for (const [key, handler] of ROLE_HANDLERS) {
      expect(handler.priority, key).toBe(c.roles.get(key)?.priority ?? null);
    }
  });
});
