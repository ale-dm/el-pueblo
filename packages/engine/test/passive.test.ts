import { describe, expect, it } from "vitest";
import { decide } from "../src/core/decide.js";
import type { GameEventEnvelope } from "../src/types/events.js";
import type { GameState } from "../src/types/state.js";
import { ctx, game, step } from "./helpers/game.js";

/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- payloads distintos por tipo */
const ofType = (events: GameEventEnvelope[], type: string): any[] => events.filter((e) => e.type === type);

describe("roles pasivos", () => {
  it("la Psíquica recibe su visión cada noche sin elegir nada", () => {
    const s: GameState = game(["psychic", "godfather", "investigator", "sheriff"], { phase: "night", dayNumber: 2 });
    const r = decide(s, { type: "timer.expired" }, ctx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const results = ofType(r.value, "investigation.result").filter((e) => e.payload.investigatorId === "p1");
    expect(results).toHaveLength(1);
    expect(results[0]!.payload.check).toBe("vision");
  });

  it("la visión de noche impar trae al menos un Mafioso; la de noche par, al menos un Town (wiki: Psychic)", () => {
    const odd: GameState = game(["psychic", "godfather", "investigator", "sheriff"], { phase: "night", dayNumber: 3 });
    const oddVision = ofType(step(odd, { type: "timer.expired" }).events, "investigation.result").find((e) => e.payload.investigatorId === "p1");
    expect(oddVision?.payload).toMatchObject({ check: "vision", side: "mafia" });
    expect(String(oddVision?.payload.result).split(", ")).toHaveLength(3);
    expect(String(oddVision?.payload.result)).toMatch(/P2/);

    const even: GameState = game(["psychic", "godfather", "investigator", "sheriff"], { phase: "night", dayNumber: 2 });
    const evenVision = ofType(step(even, { type: "timer.expired" }).events, "investigation.result").find((e) => e.payload.investigatorId === "p1");
    expect(evenVision?.payload).toMatchObject({ check: "vision", side: "town" });
    expect(String(evenVision?.payload.result).split(", ")).toHaveLength(2);
  });

  it("la Psíquica no se ofrece como acción de noche", () => {
    const s = game(["psychic", "godfather"], { phase: "night", dayNumber: 2 });
    const r = decide(s, { type: "night.action", actorId: "p1", ability: "vision", targetId: null, secondTargetId: null }, ctx());
    expect(r.ok).toBe(false);
  });

  it("una Psíquica encarcelada no recibe visión", () => {
    const s: GameState = game(["psychic", "jailor", "godfather"], { phase: "night", dayNumber: 2 });
    s.players[0]!.flags = { jailed: true };
    const r = decide(s, { type: "timer.expired" }, ctx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(ofType(r.value, "investigation.result").some((e) => e.payload.investigatorId === "p1")).toBe(false);
  });
});
