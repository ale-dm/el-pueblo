import { describe, expect, it } from "vitest";
import { levelEs } from "./roles.js";

describe("niveles de ataque y defensa", () => {
  it("traduce el nivel base y omite las condiciones", () => {
    expect(levelEs("None")).toBe("Ninguno");
    expect(levelEs("Powerful (Unstoppable after third kill)")).toBe("Potente");
    expect(levelEs("None (Basic when using a bulletproof vest)")).toBe("Ninguno");
    expect(levelEs(null)).toBeNull();
  });
});
