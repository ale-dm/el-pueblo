import { describe, expect, it } from "vitest";
import { abilityLabel } from "./text.js";

describe("textos", () => {
  it("las habilidades tienen nombre en español y, si no, se muestra la clave", () => {
    expect(abilityLabel("heal")).toBe("Curar");
    expect(abilityLabel("desconocida")).toBe("desconocida");
  });
});

import { ROLE_BLURB } from "./roles.js";
describe("roles en español", () => {
  it("cada rol del MVP tiene su descripción", () => {
    expect(Object.keys(ROLE_BLURB)).toHaveLength(30);
    expect(Object.values(ROLE_BLURB).every((t) => t.length > 10)).toBe(true);
  });
});
