import { describe, expect, it } from "vitest";
import { NOT_RESURRECTABLE_ROLES, canBeResurrected } from "./resurrect.js";
import type { PublicPlayer } from "../types.js";

// Wiki (docs/roles/Retributionist.md:236): "A Psychic, Trapper, Jailor, Veteran, Mayor, Medium, Transporter, or another
// Retributionist (if you were an Amnesiac) cannot be resurrected."
const dead = (revealedRoleKey: string | null, status: PublicPlayer["status"] = "dead") =>
  ({ status, revealedRoleKey }) as Pick<PublicPlayer, "status" | "revealedRoleKey">;

describe("Retributionist: a quién se puede alzar (wiki: Retributionist.md:236)", () => {
  it("la lista de excluidos es la de la wiki, sin Amnesiac (fuera del MVP)", () => {
    expect([...NOT_RESURRECTABLE_ROLES].sort()).toEqual(
      ["jailor", "mayor", "medium", "psychic", "retributionist", "transporter", "trapper", "veteran"],
    );
  });

  it("no ofrece a ninguno de los excluidos, ni siquiera muerto con su rol visible", () => {
    for (const role of ["psychic", "trapper", "jailor", "veteran", "mayor", "medium", "transporter", "retributionist"]) {
      expect(canBeResurrected(dead(role)), role).toBe(false);
    }
  });

  it("ofrece a un Town muerto cuyo rol se puede alzar", () => {
    for (const role of ["sheriff", "doctor", "investigator", "vigilante", "janitor"]) {
      expect(canBeResurrected(dead(role)), role).toBe(true);
    }
  });

  it("no ofrece a un vivo, ni a un muerto cuyo rol no se conoce", () => {
    expect(canBeResurrected(dead("sheriff", "alive"))).toBe(false);
    expect(canBeResurrected(dead(null))).toBe(false);
  });

  it("filtra la lista de muertos: solo quedan los que se pueden alzar", () => {
    const players = [
      { id: "p1", ...dead("sheriff") },
      { id: "p2", ...dead("jailor") },
      { id: "p3", ...dead("doctor", "alive") },
      { id: "p4", ...dead("medium") },
      { id: "p5", ...dead("investigator") },
      { id: "p6", ...dead(null) },
    ];
    expect(players.filter(canBeResurrected).map((p) => p.id)).toEqual(["p1", "p5"]);
  });
});
