import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

const night = (actorId: string, ability: string, targetId: string | null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId: null }) as const;

/** Cierra la noche tras las acciones dadas y devuelve los eventos de la resolución. */
const resolve = (s: GameState, actions: ReturnType<typeof night>[]) => {
  let st = s;
  for (const a of actions) st = step(st, a).state;
  return step(st, timer());
};

/** Jugador que abandonó la partida: sigue vivo en el motor, con connected=false (wiki: Tavern_Keeper.md:183). */
const left = (s: GameState, id: string): GameState => ({
  ...s,
  players: s.players.map((p) => (p.id === id ? { ...p, connected: false } : p)),
});

describe("Tavern Keeper: bloquear a quien abandonó la partida (wiki: Tavern_Keeper.md:183)", () => {
  it("puede elegir a quien abandonó la partida el mismo día o noche, y el bloqueo le alcanza", () => {
    const s = left(game(["tavern_keeper", "investigator", "godfather"]), "p2");
    // Wiki (Tavern_Keeper.md:183): "You may Roleblock someone who left the game the same Day/ Night."
    expect(() => step(s, night("p1", "distract", "p2"))).not.toThrow();
    const { events } = resolve(s, [night("p1", "distract", "p2"), night("p2", "investigate", "p3")]);
    expect(ofType(events, "night.action.blocked").map((e) => e.payload.actorId)).toEqual(["p2"]);
    expect(ofType(events, "investigation.result")).toEqual([]);
  });
});
