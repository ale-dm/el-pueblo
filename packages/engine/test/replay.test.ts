import { describe, expect, it } from "vitest";
import { replay } from "../src/core/replay.js";
import type { GameEventEnvelope } from "../src/types/events.js";
import type { GameState } from "../src/types/state.js";

const initial: GameState = {
  matchId: "m", engineVersion: "0.1.0", phase: "day_1", dayNumber: 1, trialsToday: 0,
  players: [], seq: 2, winner: null, votes: {}, verdicts: {}, defendantId: null,
  nightActions: {}, traps: {}, dayActionDay: {}, wills: {},
};
const ev = (seq: number): GameEventEnvelope => ({
  seq, type: "phase.started", payload: { phase: "discussion", dayNumber: 1 },
  visibility: "public", audiencePlayerId: null,
});

describe("replay", () => {
  it("salta los eventos que ya están en el estado inicial (snapshot)", () => {
    const state = replay(initial, [ev(1), ev(2), ev(3), ev(4)]);
    expect(state.seq).toBe(4);
  });

  it("sin eventos nuevos devuelve el mismo estado", () => {
    expect(replay(initial, [ev(1)])).toBe(initial);
  });
});
