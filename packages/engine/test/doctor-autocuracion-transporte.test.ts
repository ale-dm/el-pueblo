import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";

// Doctor que se autocura y transporte (wiki: docs/roles/Transporter.md:234).
// "When Transporting a Doctor or Bodyguard, if they chose to Self Heal or Vest, they will continue to do so.
//  Transporting does not force them to protect the other Transported target when they have chosen a self targeting ability."

const night = (actorId: string, ability: string, targetId: string | null, secondTargetId: string | null = null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId }) as const;

/** p1 Doctor, p2 Transporter, p3 Investigator, p4 Godfather. */
const cast = () => game(["doctor", "transporter", "investigator", "godfather"]);

const resolve = (actions: ReturnType<typeof night>[]) => {
  let s = cast();
  for (const a of actions) s = step(s, a).state;
  return step(s, timer()).events;
};

describe("Doctor autocurado y transportado (wiki: Transporter.md:234)", () => {
  it("la autocuración se queda en el Doctor: el ataque a p3 llega a la casa del Doctor y lo para", () => {
    // p2 cambia p1 (Doctor) con p3. El Godfather (p4) ataca a p3, que ahora visita la casa de p1; p1 se autocura.
    const events = resolve([night("p2", "transport", "p1", "p3"), night("p1", "selfHeal", null), night("p4", "kill", "p3")]);
    expect(ofType(events, "player.killed")).toEqual([]);
    expect(ofType(events, "attack.prevented")[0]?.payload).toEqual({ victimId: "p1", protectorId: "p1" });
  });

  it("y no protege al otro transportado: el ataque al Doctor cae en p3, que no está curado", () => {
    // p2 cambia p1 (Doctor) con p3. El Godfather ataca a p1, que ahora visita la casa de p3: muere p3, no el Doctor.
    const events = resolve([night("p2", "transport", "p1", "p3"), night("p1", "selfHeal", null), night("p4", "kill", "p1")]);
    expect(ofType(events, "player.killed").map((e) => e.payload.playerId)).toEqual(["p3"]);
  });

  it("control: sin transporte, la autocuración protege al Doctor del ataque directo", () => {
    const events = resolve([night("p1", "selfHeal", null), night("p4", "kill", "p1")]);
    expect(ofType(events, "player.killed")).toEqual([]);
  });
});
