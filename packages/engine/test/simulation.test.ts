import { describe, expect, it } from "vitest";
import { createRng, type Rng } from "../src/core/rng.js";
import { decide } from "../src/core/decide.js";
import { apply } from "../src/core/apply.js";
import { ROLE_HANDLERS } from "../src/roles/registry.js";
import { catalog, ctx, types } from "./helpers/game.js";
import type { Command } from "../src/types/commands.js";
import type { GameState, PlayerState } from "../src/types/state.js";
import type { GameEventEnvelope } from "../src/types/events.js";

/** Partida de 10 jugadores creada con el propio motor: arranque, día, noche... hasta el final. */
function newGame(seed: number): { state: GameState; rng: Rng } {
  const players: PlayerState[] = Array.from({ length: 10 }, (_, i) => ({
    id: `p${i + 1}`, seat: i + 1, nick: `P${i + 1}`, roleKey: null, faction: null, status: "alive",
    connected: true, deathReason: null, usesLeft: {}, flags: {},
  }));
  let state: GameState = {
    matchId: "m", engineVersion: "sim", phase: "day_1", dayNumber: 1, seq: 0, winner: null, players,
    trialsToday: 0, votes: {}, verdicts: {}, defendantId: null, nightActions: {}, traps: {}, dayActionDay: {}, wills: {}, jailedBy: {}, forgeries: {},
  };
  const rng = createRng(seed);
  const r = decide(state, { type: "game.start", hostId: "p1" }, { catalog, rng, now: new Date() });
  if (!r.ok) throw new Error(r.error.message);
  state = r.value.reduce(apply, state);
  return { state, rng };
}

const pick = <T,>(rng: Rng, items: readonly T[]): T => items[rng.int(0, items.length - 1)]!;

/** Decisiones aleatorias pero legales para la fase actual. */
function nextCommands(s: GameState, rng: Rng): Command[] {
  const alive = s.players.filter((p) => p.status === "alive" && p.connected);
  switch (s.phase) {
    case "day_1":
    case "discussion":
    case "defense":
    case "last_words":
      return [{ type: "timer.expired" }];
    case "voting":
      return [...alive.map((p) => ({ type: "vote" as const, voterId: p.id, targetId: rng.next() < 0.2 ? null : pick(rng, alive).id })), { type: "timer.expired" }];
    case "judgement":
      return [
        ...alive.filter((p) => p.id !== s.defendantId).map((p) => ({ type: "judgement.vote" as const, voterId: p.id, verdict: rng.next() < 0.5 ? "guilty" as const : "innocent" as const })),
        { type: "timer.expired" },
      ];
    case "night": {
      const cmds: Command[] = [];
      for (const actor of alive) {
        const handler = ROLE_HANDLERS.get(actor.roleKey ?? "");
        if (!handler) continue;
        for (const ab of handler.nightAbilities) {
          const others = alive.filter((p) => p.id !== actor.id || ab.selfAllowed || ab.target === "two");
          if (ab.target === "none") cmds.push({ type: "night.action", actorId: actor.id, ability: ab.key, targetId: null });
          else if (ab.target === "player" && others.length) {
            const target = pick(rng, others).id;
            if (ab.key === "execute") {
              const jailed = s.players.find((p) => p.flags.jailed && p.status === "alive");
              if (jailed) cmds.push({ type: "night.action", actorId: actor.id, ability: ab.key, targetId: jailed.id });
              continue;
            }
            cmds.push({ type: "night.action", actorId: actor.id, ability: ab.key, targetId: target });
          } else if (ab.target === "two" && others.length >= 2) {
            const [a, b] = rng.shuffle(others).slice(0, 2);
            cmds.push({ type: "night.action", actorId: actor.id, ability: ab.key, targetId: a!.id, secondTargetId: b!.id });
          }
        }
      }
      return [...cmds, { type: "timer.expired" }];
    }
    default:
      return [];
  }
}

describe("simulación de partidas completas", () => {
  it("300 partidas aleatorias terminan con ganador sin errores del motor", () => {
    const outcomes = { town: 0, mafia: 0 };
    const errors: string[] = [];
    for (let seed = 1; seed <= 300; seed++) {
      let { state, rng } = newGame(seed);
      let steps = 0;
      while (state.phase !== "ended" && steps < 3000) {
        const cmds = nextCommands(state, rng);
        for (const cmd of cmds) {
          const r = decide(state, cmd, { catalog, rng, now: new Date() });
          if (!r.ok) {
            // Acciones que el propio simulador no puede evitar (p. ej. usos agotados) no cuentan como error.
            if (r.error.code !== "invalid_command") errors.push(`seed ${seed}: ${cmd.type} → ${r.error.code} ${r.error.message}`);
            continue;
          }
          state = r.value.reduce(apply, state);
          if (cmd.type === "timer.expired") break;
        }
        steps++;
      }
      if (state.phase !== "ended") errors.push(`seed ${seed}: no terminó en ${steps} pasos`);
      if (state.winner === "town") outcomes.town++;
      if (state.winner === "mafia") outcomes.mafia++;
    }
    expect(errors.slice(0, 5)).toEqual([]);
    expect(outcomes.town + outcomes.mafia).toBe(300);
  });

  it("la misma semilla produce exactamente la misma partida", () => {
    const run = (seed: number) => {
      let { state, rng } = newGame(seed);
      const log: GameEventEnvelope[] = [];
      for (let i = 0; i < 400 && state.phase !== "ended"; i++) {
        for (const cmd of nextCommands(state, rng)) {
          const r = decide(state, cmd, { catalog, rng, now: new Date() });
          if (!r.ok) continue;
          log.push(...r.value);
          state = r.value.reduce(apply, state);
          if (cmd.type === "timer.expired") break;
        }
      }
      return types(log).join(",");
    };
    expect(run(42)).toBe(run(42));
  });
});
