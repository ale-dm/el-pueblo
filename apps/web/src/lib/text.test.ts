import { describe, expect, it } from "vitest";
import { CHOICE_LABEL, HYPNOSIS_TEXT, abilityLabel } from "./text.js";

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

describe("Hypnotist: textos de las opciones del MVP (wiki: Hypnotist.md:232-258)", () => {
  it("cada opción nueva se lee con su frase en español", () => {
    expect(HYPNOSIS_TEXT.transported).toBe("Fuiste transportado a otro lugar.");
    expect(HYPNOSIS_TEXT.fought_off).toBe("Te atacaron, pero alguien rechazó a tu atacante.");
    expect(HYPNOSIS_TEXT.trap_triggered).toBe("¡Has activado una trampa!");
    expect(HYPNOSIS_TEXT.trap_saved).toBe("Te atacaron, pero una trampa te salvó.");
    expect(HYPNOSIS_TEXT.trap_healed).toBe("Una trampa te atacó, pero alguien te curó.");
  });

  it("cada opción nueva tiene su etiqueta en la elección", () => {
    for (const k of ["transported", "fought_off", "trap_triggered", "trap_saved", "trap_healed"]) {
      expect(CHOICE_LABEL[k]).toBeTruthy();
    }
  });
});
