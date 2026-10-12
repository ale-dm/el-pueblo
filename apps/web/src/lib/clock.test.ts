import { describe, expect, it } from "vitest";
import { clockFraction } from "./clock.js";

describe("clockFraction", () => {
  it("el anillo se vacía a medida que baja el tiempo", () => {
    expect(clockFraction(30, 60)).toBe(0.5);
    expect(clockFraction(60, 60)).toBe(1);
    expect(clockFraction(0, 60)).toBe(0);
  });
  it("nunca sale de 0 a 1 y sin duración no hay anillo", () => {
    expect(clockFraction(90, 60)).toBe(1);
    expect(clockFraction(-3, 60)).toBe(0);
    expect(clockFraction(10, 0)).toBe(0);
  });
});
