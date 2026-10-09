import { describe, expect, it } from "vitest";
import { catalog, game, ofType, step, timer } from "./helpers/game.js";
import { CLASSIC_INVESTIGATOR_GROUPS, investigatorGroupOf } from "../src/rules/investigation.js";

const night = (actorId: string, ability: string, targetId: string | null, secondTargetId: string | null = null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId }) as const;

/** Resultado de grupo que recibe el Investigador `investigatorId` esta noche. */
function groupResult(actions: Array<ReturnType<typeof night>>, roles: string[], investigatorId: string): string | undefined {
  let s = game(roles);
  for (const a of actions) s = step(s, a).state;
  const { events } = step(s, timer());
  return ofType(events, "investigation.result").find((e) => e.payload.investigatorId === investigatorId && e.payload.check === "group")?.payload.result;
}

describe("Investigador: grupos de roles de la tabla Classic (wiki: Investigator.md)", () => {
  it("un Doctor aparece en el grupo Doctor, Disguiser o Serial Killer", () => {
    expect(groupResult([night("p1", "investigate", "p2")], ["investigator", "doctor"], "p1")).toBe("doctor,disguiser,serial_killer");
  });

  it("un Jailor aparece en el grupo Spy, Blackmailer o Jailor", () => {
    expect(groupResult([night("p1", "investigate", "p2")], ["investigator", "jailor"], "p1")).toBe("spy,blackmailer,jailor");
  });

  it("un objetivo encuadrado (Framer) da el grupo Framer, Vampire o Jester, aunque sea Town", () => {
    // p2 Framer encuadra al Doctor (p3). El Investigador lo ve como Framer, Vampire o Jester.
    expect(groupResult([night("p2", "frame", "p3"), night("p1", "investigate", "p3")], ["investigator", "framer", "doctor"], "p1"))
      .toBe("framer,vampire,jester");
  });

  it("un Mafioso disfrazado da el grupo de su rol aparente (Jailor), no el real", () => {
    // p1 Disguiser disfraza al Godfather (p2) de Jailor (p4). El Investigador (p3) investiga a p2.
    expect(groupResult([night("p1", "disguise", "p2", "p4"), night("p3", "investigate", "p2")], ["disguiser", "godfather", "investigator", "jailor"], "p3"))
      .toBe("spy,blackmailer,jailor");
  });

  it("el encuadre tiene prioridad sobre el disfraz: framed y disfrazado da el grupo del Framer", () => {
    // p2 Framer encuadra al Godfather (p3); p1 Disguiser lo disfraza de Jailor (p5). Gana el encuadre.
    const roles = ["disguiser", "framer", "godfather", "investigator", "jailor"];
    expect(groupResult([night("p1", "disguise", "p3", "p5"), night("p2", "frame", "p3"), night("p4", "investigate", "p3")], roles, "p4"))
      .toBe("framer,vampire,jester");
  });

  it("un rol del MVP que solo aparece en la tabla Coven (Tracker) no tiene grupo: resultado vacío (SKIPPED)", () => {
    expect(groupResult([night("p1", "investigate", "p2")], ["investigator", "tracker"], "p1")).toBe("");
  });
});

describe("tabla de grupos: cobertura de los roles MVP", () => {
  // Roles del MVP fuera de la tabla Classic: solo aparecen en la tabla Coven (SKIPPED, ver docs/ROLES_STATUS.md).
  const SKIPPED_NOT_IN_CLASSIC = ["crusader", "psychic", "tracker", "trapper"];

  it("cada rol MVP tiene su grupo, salvo los SKIPPED", () => {
    const mvp = [...catalog.roles.values()].filter((r) => r.mvp).map((r) => r.key);
    const withoutGroup = mvp.filter((key) => investigatorGroupOf(key) === null);
    expect(withoutGroup.sort()).toEqual([...SKIPPED_NOT_IN_CLASSIC].sort());
  });

  it("cada rol aparece en un solo grupo y todas las claves existen en el catálogo", () => {
    const keys = CLASSIC_INVESTIGATOR_GROUPS.flat();
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(catalog.roles.has(key), key).toBe(true);
  });
});
