import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

// Transporter y quien abandonó la partida (wiki: docs/roles/Transporter.md:228).

const night = (actorId: string, ability: string, targetId: string | null, secondTargetId: string | null = null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId }) as const;

/** Jugador que abandonó la partida: sigue vivo en el motor, con connected=false (wiki: Tavern_Keeper.md:183). */
const left = (s: GameState, id: string): GameState => ({
  ...s,
  players: s.players.map((p) => (p.id === id ? { ...p, connected: false } : p)),
});

const resolve = (s: GameState, actions: ReturnType<typeof night>[]) => {
  let st = s;
  for (const a of actions) st = step(st, a).state;
  return step(st, timer()).events;
};

const notices = (events: ReturnType<typeof step>["events"]) =>
  ofType(events, "night.notice").map((e) => [e.payload.playerId, e.payload.notice]);

describe("Transporter: no transporta a quien abandonó la partida (wiki: Transporter.md:228)", () => {
  it("el que abandonó como primer objetivo: no hay intercambio y el Transporter no recibe aviso", () => {
    // Wiki (Transporter.md:228): "You cannot Transport targets who left the game before the Night ends (You will receive no Transport message)."
    // p1 cambia p2 (abandonó) con p4. El Godfather (p3) mata a p4: sin intercambio, p4 muere (no pasa a p2).
    const s = left(game(["transporter", "investigator", "godfather", "investigator"]), "p2");
    const events = resolve(s, [night("p1", "transport", "p2", "p4"), night("p3", "kill", "p4")]);
    expect(ofType(events, "player.killed").map((e) => e.payload.playerId)).toEqual(["p4"]);
    expect(notices(events).filter(([, n]) => /transport/.test(String(n)))).toEqual([]);
  });

  it("el que abandonó como segundo objetivo: tampoco hay intercambio ni aviso", () => {
    // p1 cambia p4 con p2 (abandonó). El Godfather (p3) mata a p4: sin intercambio, p4 muere.
    const s = left(game(["transporter", "investigator", "godfather", "investigator"]), "p2");
    const events = resolve(s, [night("p1", "transport", "p4", "p2"), night("p3", "kill", "p4")]);
    expect(ofType(events, "player.killed").map((e) => e.payload.playerId)).toEqual(["p4"]);
    expect(notices(events).filter(([, n]) => /transport/.test(String(n)))).toEqual([]);
  });

  it("con dos vivos el intercambio sigue igual (control)", () => {
    // Sin abandono, p1 cambia p2 con p4: el Godfather que mata a p4 mata a p2.
    const s = game(["transporter", "investigator", "godfather", "investigator"]);
    const events = resolve(s, [night("p1", "transport", "p2", "p4"), night("p3", "kill", "p4")]);
    expect(ofType(events, "player.killed").map((e) => e.payload.playerId)).toEqual(["p2"]);
  });
});
