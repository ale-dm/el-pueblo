import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { apply } from "../../src/core/apply.js";
import { createRng, type Rng } from "../../src/core/rng.js";
import { decide, type EngineContext } from "../../src/core/decide.js";
import { emit } from "../../src/events/emit.js";
import type { Catalog, RoleDefinition, PhaseTiming } from "../../src/types/catalog.js";
import type { Command } from "../../src/types/commands.js";
import type { EventInput, GameEventEnvelope } from "../../src/types/events.js";
import type { GameState, PlayerState } from "../../src/types/state.js";
import { ROLE_HANDLERS } from "../../src/roles/registry.js";

const CATALOG_DIR = fileURLToPath(new URL("../../../../data/catalog", import.meta.url));

/** Catálogo leído de data/catalog (mismas filas que la BD). */
export function loadTestCatalog(): Catalog {
  const rows = <T>(name: string) => JSON.parse(readFileSync(`${CATALOG_DIR}/${name}.json`, "utf8")) as T[];
  const roles = new Map<string, RoleDefinition>();
  for (const r of rows<any>("roles")) {
    roles.set(r.key, {
      key: r.key, name: r.name, faction: r.faction_key, alignmentKey: r.alignment_key, priority: r.priority,
      isUnique: r.is_unique, mvp: r.mvp, attack: r.attack, defense: r.defense, attributeLines: r.attribute_lines, summary: r.summary,
    });
  }
  const phaseTimings: PhaseTiming[] = rows<any>("phase_timings").map((p) => ({
    mode: p.mode, phase: p.phase, seconds: p.seconds, sortOrder: p.sort_order,
  }));
  const votingThresholds = new Map<number, number>(rows<any>("voting_thresholds").map((t) => [t.alive, t.votes_required]));
  return { roles, phaseTimings, votingThresholds };
}

export const catalog = loadTestCatalog();

export function ctx(seed = 1): EngineContext {
  return { catalog, rng: createRng(seed), now: new Date("2026-10-08T12:00:00Z") };
}

/** Partida con roles concretos. Los jugadores son p1, p2... en orden de asiento. Por defecto de noche. */
export function game(roles: string[], overrides: Partial<GameState> = {}): GameState {
  const players: PlayerState[] = roles.map((roleKey, i) => {
    const handler = ROLE_HANDLERS.get(roleKey);
    if (!handler) throw new Error(`rol de prueba desconocido: ${roleKey}`);
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
    trialsToday: 0, votes: {}, verdicts: {}, defendantId: null, nightActions: {}, traps: {}, dayActionDay: {}, wills: {}, jailedBy: {},
    ...overrides,
  };
}

/** Aplica eventos numerados a un estado. */
export function applyAll(state: GameState, events: GameEventEnvelope[]): GameState {
  return events.reduce(apply, state);
}

/** Ejecuta un comando y aplica sus eventos. Falla el test si el motor lo rechaza. */
export function step(state: GameState, command: Command, seed = 1): { state: GameState; events: GameEventEnvelope[] } {
  const r = decide(state, command, ctx(seed));
  if (!r.ok) throw new Error(`comando rechazado: ${r.error.code} · ${r.error.message}`);
  return { state: applyAll(state, r.value), events: r.value };
}

/** Ejecuta un comando y devuelve el error (o null si fue aceptado). */
export function rejected(state: GameState, command: Command): string | null {
  const r = decide(state, command, ctx());
  return r.ok ? null : `${r.error.code}: ${r.error.message}`;
}

export const timer = (): Command => ({ type: "timer.expired" });

export const types = (events: GameEventEnvelope[]) => events.map((e) => e.type);

export const ofType = <T extends GameEventEnvelope["type"]>(events: GameEventEnvelope[], type: T) =>
  events.filter((e): e is Extract<GameEventEnvelope, { type: T }> => e.type === type);

export type { Rng, EventInput, emit };
