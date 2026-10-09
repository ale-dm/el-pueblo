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

const notices = (events: ReturnType<typeof resolve>["events"]) =>
  ofType(events, "night.notice").map((e) => [e.payload.playerId, e.payload.notice]);

describe("Tavern Keeper: avisos al bloqueado, al inmune y al encarcelado (wiki: Tavern_Keeper.md:347-357)", () => {
  it("el bloqueado con acción recibe \"Someone occupied your night. You were role blocked!\" (Tavern_Keeper.md:347)", () => {
    const { events } = resolve(game(["tavern_keeper", "investigator", "godfather"]), [night("p1", "distract", "p2"), night("p2", "investigate", "p3")]);
    expect(ofType(events, "night.action.blocked").map((e) => [e.payload.actorId, e.payload.cause])).toEqual([["p2", "roleblock"]]);
    expect(ofType(events, "night.action.blocked")[0]!.visibility).toBe("private");
  });

  it("el bloqueado sin acción también recibe el aviso de bloqueo (Tavern_Keeper.md:349)", () => {
    const { events } = resolve(game(["tavern_keeper", "investigator", "godfather"]), [night("p1", "distract", "p2")]);
    expect(notices(events)).toContainEqual(["p2", "blocked_occupied"]);
  });

  it("el inmune recibe \"Someone tried to role block you but you are immune!\" y no queda bloqueado (Tavern_Keeper.md:351-353)", () => {
    // Veteran (p2) es inmune al bloqueo: wiki Tavern_Keeper.md:179.
    const { events } = resolve(game(["tavern_keeper", "veteran", "godfather"]), [night("p1", "distract", "p2"), night("p2", "alert", null)]);
    expect(notices(events)).toContainEqual(["p2", "blocked_immune"]);
    expect(ofType(events, "night.action.blocked")).toEqual([]);
    expect(ofType(events, "uses.left").map((e) => e.payload.playerId)).toContain("p2");
  });

  it("el encarcelado recibe \"Someone tried to role block you but you were in jail.\" y el bloqueo no le llega (Tavern_Keeper.md:355-357)", () => {
    const s = game(["tavern_keeper", "investigator", "jailor"]);
    const jailed: GameState = { ...s, jailedBy: { p2: "p3" }, players: s.players.map((p) => (p.id === "p2" ? { ...p, flags: { ...p.flags, jailed: true } } : p)) };
    const { events } = resolve(jailed, [night("p1", "distract", "p2"), night("p2", "investigate", "p3")]);
    expect(notices(events)).toContainEqual(["p2", "blocked_jailed"]);
    // La acción del encarcelado sí queda cancelada, pero por la cárcel, no por el bloqueo.
    expect(ofType(events, "night.action.blocked").map((e) => [e.payload.actorId, e.payload.cause])).toEqual([["p2", "jail"]]);
    // Sin bloqueo por parte del Tavern Keeper: el encarcelado no recibe el aviso de "ocupado" (el de la cárcel es otro).
    expect(notices(events)).not.toContainEqual(["p2", "blocked_occupied"]);
  });
});
