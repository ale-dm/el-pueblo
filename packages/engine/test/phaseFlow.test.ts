import { describe, expect, it } from "vitest";
import { decide } from "../src/core/decide.js";
import { ctx, game } from "./helpers/game.js";

const ROLES = ["godfather", "investigator", "sheriff", "doctor", "mayor", "jailor", "veteran", "bodyguard", "medium", "tracker"];

describe("flujo de fases", () => {
  it("el día 1 no tiene votación: al acabar la charla llega la noche 1", () => {
    const s = game(ROLES, { phase: "day_1", dayNumber: 1 });
    const r = decide(s, { type: "timer.expired" }, ctx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.at(-1)?.payload).toEqual({ phase: "night", dayNumber: 1 });
    expect(r.value.some((e) => e.type === "phase.started" && e.payload.phase === "voting")).toBe(false);
  });

  it("en el día 1 no se puede votar", () => {
    const s = game(ROLES, { phase: "day_1", dayNumber: 1 });
    const r = decide(s, { type: "vote", voterId: "p2", targetId: "p1" }, ctx());
    expect(r.ok).toBe(false);
  });

  it("del día 2 en adelante la discusión pasa a votación", () => {
    const s = game(ROLES, { phase: "discussion", dayNumber: 2 });
    const r = decide(s, { type: "timer.expired" }, ctx());
    expect(r.ok && r.value.at(-1)?.payload).toEqual({ phase: "voting", dayNumber: 2 });
  });

  it("la noche 1 lleva al día 2 con discusión", () => {
    const s = game(ROLES, { phase: "night", dayNumber: 1 });
    const r = decide(s, { type: "timer.expired" }, ctx());
    expect(r.ok && r.value.at(-1)?.payload).toEqual({ phase: "discussion", dayNumber: 2 });
  });
});
