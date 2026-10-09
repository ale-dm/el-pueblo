import { describe, expect, it } from "vitest";
import { catalog, ctx, ofType, rejected } from "./helpers/game.js";
import { decide } from "../src/core/decide.js";
import { buildRoleList } from "../src/setup/roleList.js";
import { createRng } from "../src/core/rng.js";
import type { GameState, PlayerState } from "../src/types/state.js";

function lobby(n: number): GameState {
  const players: PlayerState[] = Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`, seat: i + 1, nick: `P${i + 1}`, roleKey: null, faction: null, status: "alive",
    connected: true, deathReason: null, usesLeft: {}, flags: {},
  }));
  return {
    matchId: "m", engineVersion: "test", phase: "day_1", dayNumber: 1, seq: 0, winner: null, players,
    trialsToday: 0, votes: {}, verdicts: {}, defendantId: null, nightActions: {}, traps: {}, dayActionDay: {}, wills: {}, jailedBy: {}, forgeries: {},
  };
}

describe("arranque de partida", () => {
  it("reparte roles: 3 Mafia y 7 Town con 10 jugadores, con Godfather", () => {
    const s = lobby(10);
    const r = decide(s, { type: "game.start", hostId: "p1" }, ctx(7));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const roles = ofType(r.value, "roles.assigned").map((e) => e.payload);
    expect(roles).toHaveLength(10);
    expect(roles.filter((x) => x.faction === "mafia")).toHaveLength(3);
    expect(roles.some((x) => x.roleKey === "godfather")).toBe(true);
    expect(r.value.at(-1)?.payload).toEqual({ phase: "day_1", dayNumber: 1 });
  });

  it("con 15 jugadores hay 4 Mafia", () => {
    const roles = buildRoleList(15, catalog, createRng(3));
    expect(roles.filter((k) => catalog.roles.get(k)?.faction === "mafia")).toHaveLength(4);
    expect(roles).toHaveLength(15);
  });

  it("el Vampire Hunter no sale: no hay Vampiros en el MVP (A1)", () => {
    expect(catalog.roles.get("vampire_hunter")?.mvp).toBe(false);
    for (let seed = 1; seed <= 50; seed++) {
      expect(buildRoleList(15, catalog, createRng(seed))).not.toContain("vampire_hunter");
    }
  });

  it("los roles únicos no se repiten", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const roles = buildRoleList(15, catalog, createRng(seed));
      const unique = roles.filter((k) => catalog.roles.get(k)?.isUnique);
      expect(new Set(unique).size).toBe(unique.length);
    }
  });

  it("solo el anfitrión puede empezar", () => {
    expect(rejected(lobby(10), { type: "game.start", hostId: "p2" })).toMatch(/anfitrión/);
  });

  it("no se puede empezar con menos de 10 jugadores", () => {
    expect(rejected(lobby(9), { type: "game.start", hostId: "p1" })).toMatch(/entre 10 y 15/);
  });

  it("no se puede empezar dos veces", () => {
    const r = decide(lobby(10), { type: "game.start", hostId: "p1" }, ctx(7));
    if (!r.ok) throw new Error("arranque inválido");
    const started = r.value.reduce((s) => s, lobby(10));
    expect(started.phase).toBe("day_1");
  });
});
