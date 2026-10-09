import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";
import type { GameState, PlayerState } from "../src/types/state.js";

// Órdenes de la Mafia con bloqueos (wiki: docs/roles/Godfather.md:223, 225).
// Godfather.md:223: "If you are Roleblocked, then the Mafioso will attack his own target. If the Mafioso did not pick or was
// Roleblocked also, no one will be attacked."
// Godfather.md:225: "If your Mafioso is role blocked, dead, or does not exist, you will attack the target."
// Godfather.md:227: "If there is a Mafioso (and they are not Roleblocked that night), then they will kill the target for you."
// Quién mata se lee de la nota de muerte: "death.note.authored" lleva el autor de la muerte (Godfather.md:235).
// Un bloqueo llega aunque el bloqueado no tuviera acción (Tavern_Keeper.md:347-349).
// Solo el kill lleva nota de muerte: el motor rechaza una nota en otra habilidad.
const act = (actorId: string, ability: string, targetId: string | null) =>
  ability === "kill"
    ? ({ type: "night.action", actorId, ability, targetId, secondTargetId: null, note: `nota de ${actorId}` } as const)
    : ({ type: "night.action", actorId, ability, targetId, secondTargetId: null } as const);

/** Resuelve la noche con las acciones dadas. */
function resolve(state: GameState, actions: Array<ReturnType<typeof act>>) {
  let s = state;
  for (const a of actions) s = step(s, a).state;
  return step(s, timer());
}

/** Muertos de la noche y quién los mató (autor de la nota), como pares [víctima, autor]. */
const killers = (events: ReturnType<typeof step>["events"]) =>
  ofType(events, "death.note.authored").map((e) => [e.payload.victimId, e.payload.authorId]);

/** Copia del estado con un jugador cambiado (estado de partida previo a la noche). */
const withPlayer = (s: GameState, id: string, patch: Partial<PlayerState>): GameState => ({
  ...s,
  players: s.players.map((p) => (p.id === id ? { ...p, ...patch } : p)),
});

/** Ids de los jugadores vivos al final. */
const alive = (s: GameState) => s.players.filter((p) => p.status === "alive").map((p) => p.id);

// p1 Godfather, p2 Mafioso, p3 y p4 Tavern Keeper, p5 y p6 Investigator.
const roster = ["godfather", "mafioso", "tavern_keeper", "tavern_keeper", "investigator", "investigator"];

describe("Órdenes de la Mafia con bloqueos (wiki: Godfather.md:223, 225)", () => {
  it("ambos actúan sin bloqueo: el Mafioso ejecuta la orden del Godfather (Godfather.md:221, 227)", () => {
    const { events, state } = resolve(game(roster), [act("p1", "kill", "p5"), act("p2", "kill", "p6")]);
    expect(killers(events)).toEqual([["p5", "p2"]]);
    expect(alive(state)).toContain("p6");
  });

  it("Godfather bloqueado, Mafioso elige: el Mafioso ataca su propio objetivo (Godfather.md:223)", () => {
    const { events } = resolve(game(roster), [act("p3", "distract", "p1"), act("p2", "kill", "p6")]);
    expect(killers(events)).toEqual([["p6", "p2"]]);
  });

  it("Godfather bloqueado, Mafioso no elige: nadie ataca (Godfather.md:223)", () => {
    const { events, state } = resolve(game(roster), [act("p3", "distract", "p1")]);
    expect(killers(events)).toEqual([]);
    expect(alive(state)).toEqual(["p1", "p2", "p3", "p4", "p5", "p6"]);
  });

  it("Godfather bloqueado y Mafioso bloqueado: nadie ataca (Godfather.md:223)", () => {
    const { events, state } = resolve(game(roster), [act("p3", "distract", "p1"), act("p4", "distract", "p2"), act("p2", "kill", "p6")]);
    expect(killers(events)).toEqual([]);
    expect(alive(state)).toEqual(["p1", "p2", "p3", "p4", "p5", "p6"]);
  });

  it("Mafioso bloqueado con su acción: el Godfather ataca el objetivo de la orden (Godfather.md:225)", () => {
    const { events } = resolve(game(roster), [act("p4", "distract", "p2"), act("p1", "kill", "p5"), act("p2", "kill", "p6")]);
    expect(killers(events)).toEqual([["p5", "p1"]]);
  });

  it("Mafioso bloqueado sin acción propia: el Godfather ataca el objetivo de la orden (Godfather.md:225)", () => {
    // El Tavern Keeper bloquea al Mafioso, que no envió acción: sigue bloqueado (Godfather.md:227; Tavern_Keeper.md:349).
    const { events } = resolve(game(roster), [act("p4", "distract", "p2"), act("p1", "kill", "p5")]);
    expect(killers(events)).toEqual([["p5", "p1"]]);
  });

  it("Mafioso muerto: el Godfather ataca el objetivo de la orden (Godfather.md:225)", () => {
    const { events } = resolve(withPlayer(game(roster), "p2", { status: "dead" }), [act("p1", "kill", "p5")]);
    expect(killers(events)).toEqual([["p5", "p1"]]);
  });

  it("no hay Mafioso: el Godfather ataca el objetivo de la orden (Godfather.md:225)", () => {
    const { events } = resolve(game(["godfather", "tavern_keeper", "investigator"]), [act("p1", "kill", "p3")]);
    expect(killers(events)).toEqual([["p3", "p1"]]);
  });

  it("Godfather bloqueado y Mafioso muerto: nadie ataca (Godfather.md:223)", () => {
    const { events } = resolve(withPlayer(game(roster), "p2", { status: "dead" }), [act("p3", "distract", "p1"), act("p1", "kill", "p5")]);
    expect(killers(events)).toEqual([]);
  });

  it("Godfather bloqueado y no hay Mafioso: nadie ataca (Godfather.md:223)", () => {
    const { events } = resolve(game(["godfather", "tavern_keeper", "investigator"]), [act("p2", "distract", "p1"), act("p1", "kill", "p3")]);
    expect(killers(events)).toEqual([]);
  });

  it("Mafioso encarcelado sin acción: el Godfather ataca el objetivo de la orden (Godfather.md:225)", () => {
    // Un encarcelado no actúa (Jailor.md:252). El Jailor es p3; el Mafioso está en su cárcel sin acción.
    const s = game(["godfather", "mafioso", "jailor", "investigator", "investigator"], { dayNumber: 2, jailedBy: { p2: "p3" } });
    const { events } = resolve(withPlayer(s, "p2", { flags: { jailed: true } }), [act("p1", "kill", "p4")]);
    expect(killers(events)).toEqual([["p4", "p1"]]);
  });
});
