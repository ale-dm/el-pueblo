import { describe, expect, it } from "vitest";
import { AVATARS, avatarUrl } from "./avatars.js";

describe("avatarUrl: personaje por asiento", () => {
  it("cada jugador tiene un personaje por defecto de la wiki, siempre el mismo para su asiento", () => {
    for (let seat = 1; seat <= 16; seat++) {
      expect(avatarUrl(seat)).toBe(avatarUrl(seat));
      expect(avatarUrl(seat)).toMatch(/^\/avatars\/[A-Za-z]+\.webp$/);
    }
  });

  it("los diez primeros asientos reparten los personajes sin repetir hasta agotarlos", () => {
    const urls = Array.from({ length: AVATARS.length }, (_, i) => avatarUrl(i + 1));
    expect(new Set(urls).size).toBe(AVATARS.length);
  });
});
