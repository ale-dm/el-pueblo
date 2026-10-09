import { describe, expect, it } from "vitest";
import { usedBodyMark } from "./corpses.js";

const view = (usedBodies: string[]) => ({ me: { usedBodies } }) as Parameters<typeof usedBodyMark>[0];

describe("icono de cuerpo usado del Retributionist (wiki: Retributionist.md:204)", () => {
  it("aparece junto al muerto que el Retributionist ya usó", () => {
    expect(usedBodyMark(view(["p3"]), { id: "p3", status: "dead" })).toBe(true);
  });

  it("no aparece junto a un muerto no usado, ni a un vivo", () => {
    expect(usedBodyMark(view(["p3"]), { id: "p4", status: "dead" })).toBe(false);
    expect(usedBodyMark(view([]), { id: "p3", status: "dead" })).toBe(false);
    expect(usedBodyMark(view(["p3"]), { id: "p3", status: "alive" })).toBe(false);
  });
});
