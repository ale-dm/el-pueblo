import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

const night = (actorId: string, ability: string, targetId: string | null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId: null }) as const;

describe("Doctor: lo que no puede hacer (wiki: Doctor.md:233-245)", () => {
  it("no quita un encuadre: curar a un encuadrado deja el encuadre puesto y no se limpia (Doctor.md:245)", () => {
    // Wiki (Doctor.md:245): "You cannot: Remove a Frame, douse, hex, or the plague from anyone".
    const s0 = game(["doctor", "sheriff", "godfather"]);
    const framed: GameState = { ...s0, players: s0.players.map((p) => (p.id === "p2" ? { ...p, flags: { ...p.flags, framed: true } } : p)) };
    const s = step(framed, night("p1", "heal", "p2")).state;
    const { events, state } = step(s, timer());
    expect(state.players.find((p) => p.id === "p2")?.flags.framed).toBe(true);
    expect(ofType(events, "effect.cleared")).toEqual([]);
  });
});
