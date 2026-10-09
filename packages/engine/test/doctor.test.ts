import { describe, expect, it } from "vitest";
import { apply } from "../src/core/apply.js";
import { decide } from "../src/core/decide.js";
import type { Command } from "../src/types/commands.js";
import type { GameEventEnvelope } from "../src/types/events.js";
import type { GameState } from "../src/types/state.js";
import { ctx, game } from "./helpers/game.js";

/** Aplica un comando y devuelve el estado y los eventos nuevos. */
function play(s: GameState, command: Command): { state: GameState; events: GameEventEnvelope[] } {
  const r = decide(s, command, ctx());
  if (!r.ok) throw new Error(r.error.message);
  return { state: r.value.reduce(apply, s), events: r.value };
}

const killed = (events: GameEventEnvelope[]) => events.filter((e) => e.type === "player.killed").map((e) => e.payload.playerId);

describe("Doctor: autocuración limitada", () => {
  it("puede curarse a sí mismo una vez por partida", () => {
    // p1 Doctor, p2 Godfather ataca a p1. Sin autocuración, p1 muere.
    let s = game(["doctor", "godfather", "investigator"], { phase: "night", dayNumber: 2 });
    s = play(s, { type: "night.action", actorId: "p1", ability: "selfHeal", targetId: null, secondTargetId: null }).state;
    s = play(s, { type: "night.action", actorId: "p2", ability: "kill", targetId: "p1", secondTargetId: null }).state;
    const resolved = play(s, { type: "timer.expired" });
    expect(killed(resolved.events)).not.toContain("p1");
  });

  it("no puede volver a curarse cuando ya ha gastado su uso", () => {
    const s = game(["doctor", "godfather"], { phase: "night", dayNumber: 2 });
    s.players[0]!.usesLeft = { ...s.players[0]!.usesLeft, selfHeal: 0 };
    const r = decide(s, { type: "night.action", actorId: "p1", ability: "selfHeal", targetId: null, secondTargetId: null }, ctx());
    expect(r.ok).toBe(false);
  });

  it("no puede curar a un Mayor que ya se ha revelado", () => {
    let s = game(["doctor", "godfather", "mayor"], { phase: "night", dayNumber: 2 });
    s.players[2]!.flags = { mayorRevealed: true };
    s = play(s, { type: "night.action", actorId: "p1", ability: "heal", targetId: "p3", secondTargetId: null }).state;
    s = play(s, { type: "night.action", actorId: "p2", ability: "kill", targetId: "p3", secondTargetId: null }).state;
    const resolved = play(s, { type: "timer.expired" });
    expect(killed(resolved.events)).toContain("p3");
  });
});
