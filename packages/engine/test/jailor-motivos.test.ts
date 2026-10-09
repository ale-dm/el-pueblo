import { describe, expect, it } from "vitest";
import { game, ofType, rejected, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

const act = (actorId: string, ability: string, targetId: string | null, choice: string | null = null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId: null, choice }) as const;

// p1 Jailor tiene a p2 encarcelado (wiki: Jailor.md:322 para las razones; Jailor.md:252 para el encarcelado).
const jailed = (): GameState => {
  const s = game(["jailor", "investigator", "godfather"], { dayNumber: 2, jailedBy: { p2: "p1" } });
  return { ...s, players: s.players.map((p) => (p.id === "p2" ? { ...p, flags: { ...p.flags, jailed: true } } : p)) };
};

const executed = (choice: string | null) => {
  const s = step(jailed(), act("p1", "execute", "p2", choice)).state;
  return ofType(step(s, timer()).events, "player.killed").filter((e) => e.payload.playerId === "p2").map((e) => e.payload.reasons);
};

describe("Jailor: motivos de la nota (wiki: Jailor.md:322; Death_Note_ToS.md:11, 76-92)", () => {
  it("sin marcar nada, queda marcado \"No reason specified\" (Jailor.md:322; Death_Note_ToS.md:90)", () => {
    expect(executed(null)).toEqual([["no_reason"]]);
  });

  it("se pueden marcar varios motivos a la vez (Jailor.md:322: \"a check mark on any of these reasons\")", () => {
    expect(executed("evildoer,quiet,discretion")).toEqual([["evildoer", "quiet", "discretion"]]);
  });

  it("un motivo que no está en la lista, o repetido, se rechaza", () => {
    expect(rejected(jailed(), act("p1", "execute", "p2", "bogus"))).toMatch(/Motivo no válido/);
    expect(rejected(jailed(), act("p1", "execute", "p2", "quiet,quiet"))).toMatch(/Motivo no válido/);
  });

  it("solo la ejecución del Jailor lleva motivos: otra muerte no los trae", () => {
    const s = game(["godfather", "investigator", "sheriff"], { dayNumber: 2 });
    const { events } = step(step(s, act("p1", "kill", "p2")).state, timer());
    const killed = ofType(events, "player.killed");
    expect(killed.length).toBeGreaterThan(0);
    for (const e of killed) expect(e.payload.reasons).toBeUndefined();
  });
});
