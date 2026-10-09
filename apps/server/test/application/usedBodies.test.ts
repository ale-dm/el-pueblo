import { describe, expect, it } from "vitest";
import { usedBodiesFor } from "../../src/application/use-cases/getView.js";

// Wiki (docs/roles/Retributionist.md:204): "The icon that displays next to a player in the graveyard after you have used their body".
const players = [
  { id: "p1", status: "alive", flags: {} },
  { id: "p2", status: "dead", flags: { zombied: true } },
  { id: "p3", status: "dead", flags: {} },
];

describe("cuerpos usados por el Retributionist, solo para él (wiki: Retributionist.md:204)", () => {
  it("el Retributionist ve los cuerpos que ya usó", () => {
    expect(usedBodiesFor("retributionist", players)).toEqual(["p2"]);
  });

  it("los demás roles no reciben la lista", () => {
    expect(usedBodiesFor("sheriff", players)).toEqual([]);
    expect(usedBodiesFor(null, players)).toEqual([]);
  });
});
