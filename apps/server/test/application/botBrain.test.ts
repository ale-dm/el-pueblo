import { describe, expect, it } from "vitest";
import { ROLE_HANDLERS, createRng, type GameState, type PlayerState } from "@el-pueblo/engine";
import { planBotCommands } from "../../src/application/bots/brain.js";

/** Partida mínima de noche con los roles dados (p1, p2... en orden de asiento). */
function nightState(roles: string[], overrides: Partial<GameState> = {}): GameState {
  const players: PlayerState[] = roles.map((roleKey, i) => {
    const handler = ROLE_HANDLERS.get(roleKey)!;
    const usesLeft: Record<string, number> = {};
    for (const a of [...handler.nightAbilities, ...handler.dayAbilities]) {
      if (a.usesLimit !== null) usesLeft[a.key] = a.usesLimit;
    }
    return {
      id: `p${i + 1}`, seat: i + 1, nick: `P${i + 1}`, roleKey, faction: handler.faction,
      status: "alive", connected: true, deathReason: null, usesLeft, flags: {},
    };
  });
  return {
    matchId: "m", engineVersion: "test", phase: "night", dayNumber: 1, seq: 0, winner: null, players,
    trialsToday: 0, votes: {}, verdicts: {}, defendantId: null, nightActions: {}, traps: {}, dayActionDay: {},
    wills: {}, jailedBy: {}, forgeries: {}, ...overrides,
  };
}

/** Comandos de noche que planea un bot, para varias semillas. */
function nightCommands(s: GameState, botId: string, seeds = 20) {
  const out: Array<{ ability: string; targetId: string | null }> = [];
  for (let seed = 1; seed <= seeds; seed++) {
    for (const { botId: id, command } of planBotCommands(s, new Set([botId]), createRng(seed))) {
      if (id === botId && command.type === "night.action") out.push({ ability: command.ability, targetId: command.targetId });
    }
  }
  return out;
}

describe("bots: reglas de noche (wiki)", () => {
  it("el Vigilante bot no dispara la primera noche", () => {
    const s = nightState(["vigilante", "investigator", "godfather"]);
    expect(nightCommands(s, "p1").filter((c) => c.ability === "shoot")).toEqual([]);
  });

  it("el Vigilante bot sí dispara a partir de la segunda noche", () => {
    const s = nightState(["vigilante", "investigator", "godfather"], { dayNumber: 2 });
    expect(nightCommands(s, "p1").some((c) => c.ability === "shoot")).toBe(true);
  });

  it("el Ambusher bot nunca elige a un miembro de la Mafia", () => {
    const s = nightState(["ambusher", "godfather", "investigator", "sheriff"]);
    const ambush = nightCommands(s, "p1").filter((c) => c.ability === "ambush");
    expect(ambush.length).toBeGreaterThan(0);
    expect(ambush.map((c) => c.targetId)).not.toContain("p2");
  });

  it("el Tavern Keeper bot nunca bloquea al Mayor, cuya habilidad es de día (wiki: Tavern_Keeper.md:181)", () => {
    const s = nightState(["tavern_keeper", "mayor", "investigator", "godfather"]);
    const distracts = nightCommands(s, "p1").filter((c) => c.ability === "distract");
    expect(distracts.length).toBeGreaterThan(0);
    expect(distracts.map((c) => c.targetId)).not.toContain("p2");
  });

  it("el Trapper bot no se elige a sí mismo para poner una trampa", () => {
    // Con la trampa construida (lista para colocar, Trapper.md:252).
    const s = nightState(["trapper", "investigator", "sheriff"], { traps: { p1: { targetId: null, readyDay: 1 } } });
    const traps = nightCommands(s, "p1").filter((c) => c.ability === "trap");
    expect(traps.length).toBeGreaterThan(0);
    expect(traps.map((c) => c.targetId)).not.toContain("p1");
  });

  it("el Trapper bot sin trampa construida no pone ninguna (Trapper.md:252)", () => {
    const s = nightState(["trapper", "investigator", "sheriff"]);
    expect(nightCommands(s, "p1").filter((c) => c.ability === "trap")).toEqual([]);
  });

  it("el Trapper bot con una trampa puesta no pone otra", () => {
    const s = nightState(["trapper", "investigator", "sheriff"], { traps: { p1: { targetId: "p2", readyDay: 1 } } });
    expect(nightCommands(s, "p1").filter((c) => c.ability === "trap")).toEqual([]);
  });
});
