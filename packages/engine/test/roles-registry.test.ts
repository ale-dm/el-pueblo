import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ROLE_HANDLERS } from "../src/roles/registry.js";

// Fuente de verdad: data/catalog/roles.json (mismo contenido que la tabla `roles`).
const catalogPath = fileURLToPath(new URL("../../../data/catalog/roles.json", import.meta.url));
const catalog: Array<{ key: string; name: string; faction_key: string; mvp: boolean }> = JSON.parse(
  readFileSync(catalogPath, "utf8"),
);

describe("registro de roles del MVP", () => {
  const mvp = catalog.filter((r) => r.mvp);

  it("hay un handler por cada rol del MVP", () => {
    expect(ROLE_HANDLERS.size).toBe(mvp.length);
    for (const role of mvp) expect(ROLE_HANDLERS.has(role.key), role.key).toBe(true);
  });

  it("el bando de cada handler coincide con el catálogo", () => {
    for (const role of mvp) {
      expect(ROLE_HANDLERS.get(role.key)?.faction, role.key).toBe(role.faction_key);
    }
  });

  it("no hay handlers fuera del MVP", () => {
    const mvpKeys = new Set(mvp.map((r) => r.key));
    for (const key of ROLE_HANDLERS.keys()) expect(mvpKeys.has(key), key).toBe(true);
  });
});
