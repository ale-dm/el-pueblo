import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

// Vigilante zombi (wiki: docs/roles/Retributionist.md:294-308; Retributionist.md:155 "Each zombie can be used once before it rots.").
// "Vigilante (with bullets)": "Will shoot the target. The Retributionist is not affected by guilt."
// "Vigilante (without bullets)": "No effect." (y sirve para que un Lookout o un Tracker vea al Retributionist).

const raise = (targetId: string, secondTargetId: string) =>
  ({ type: "night.action", actorId: "p1", ability: "raise", targetId, secondTargetId, choice: null }) as const;

/** p1 Retributionist; p2 Vigilante muerto (zombi) con `bullets` balas; p3 Investigator (objetivo); p4 Lookout. */
function zombieVigilante(bullets: number): GameState {
  const s = game(["retributionist", "vigilante", "investigator", "lookout"]);
  return {
    ...s,
    players: s.players.map((p) =>
      p.id === "p2" ? { ...p, status: "dead" as const, usesLeft: { ...p.usesLeft, shoot: bullets } } : p,
    ),
  };
}

const resolve = (s: GameState, actions: Array<Parameters<typeof step>[1]>) => {
  let st = s;
  for (const a of actions) st = step(st, a).state;
  return step(st, timer()).events;
};

describe("Vigilante zombi con balas (wiki: Retributionist.md:294-300)", () => {
  it("dispara con sus balas restantes y mata al objetivo", () => {
    const events = resolve(zombieVigilante(2), [raise("p2", "p3")]);
    expect(ofType(events, "player.killed").map((e) => [e.payload.playerId, e.payload.cause])).toEqual([["p3", "shot"]]);
  });

  it("la culpa no afecta al Retributionist: el zombi que mata a un Town no le marca como culpable", () => {
    // Wiki (Retributionist.md:300): "The Retributionist is not affected by guilt."
    const events = resolve(zombieVigilante(2), [raise("p2", "p3")]);
    expect(ofType(events, "effect.applied").filter((e) => e.payload.flag === "guilty")).toEqual([]);
    expect(ofType(events, "player.killed").map((e) => e.payload.playerId)).not.toContain("p1");
  });
});

describe("Vigilante zombi sin balas (wiki: Retributionist.md:302-304)", () => {
  it("no dispara: el objetivo sigue vivo", () => {
    // Wiki (Retributionist.md:304): "No effect."
    const events = resolve(zombieVigilante(0), [raise("p2", "p3")]);
    expect(ofType(events, "player.killed")).toEqual([]);
  });

  it("aun así visita a su objetivo: el Lookout ve al zombi en esa casa (Retributionist.md:304)", () => {
    // Wiki (Retributionist.md:304): "You can use it to prove yourself as the Retributionist to a Lookout or Tracker."
    const events = resolve(zombieVigilante(0), [raise("p2", "p3"), { type: "night.action", actorId: "p4", ability: "watch", targetId: "p3", secondTargetId: null, choice: null }]);
    const results = ofType(events, "investigation.result").filter((e) => e.payload.investigatorId === "p4").map((e) => e.payload.result);
    expect(results).toEqual(["P2"]);
  });
});
