import type { Catalog } from "../types/catalog.js";
import type { EventInput } from "../types/events.js";
import type { Command } from "../types/commands.js";
import type { GameState } from "../types/state.js";
import type { Rng } from "../core/rng.js";
import { err, ok, type Result } from "../core/result.js";
import { ROLE_HANDLERS } from "../roles/registry.js";
import { buildRoleList } from "./roleList.js";
import { GAME_LIMITS } from "./limits.js";

type StartCommand = Extract<Command, { type: "game.start" }>;

/** Reparte roles y abre el primer día. Solo desde el lobby y solo el host. */
export function startGame(state: GameState, cmd: StartCommand, catalog: Catalog, rng: Rng): Result<EventInput[]> {
  if (state.phase !== "day_1" || state.players.some((p) => p.roleKey !== null)) {
    return err("wrong_phase", "La partida ya ha empezado");
  }
  const host = state.players.find((p) => p.seat === 1);
  if (!host || host.id !== cmd.hostId) return err("invalid_command", "Solo el anfitrión puede empezar la partida");
  const n = state.players.length;
  if (n < GAME_LIMITS.minPlayers || n > GAME_LIMITS.maxPlayers) {
    return err("invalid_command", `Se necesitan entre ${GAME_LIMITS.minPlayers} y ${GAME_LIMITS.maxPlayers} jugadores`);
  }

  const roles = rng.shuffle(buildRoleList(n, catalog, rng));
  const seats = rng.shuffle(state.players);
  const events: EventInput[] = [{ type: "game.started", payload: { playerCount: n } }];
  seats.forEach((player, i) => {
    const roleKey = roles[i]!;
    const def = catalog.roles.get(roleKey);
    const handler = ROLE_HANDLERS.get(roleKey);
    if (!def || !handler) throw new Error(`startGame: rol desconocido ${roleKey}`);
    const uses: Record<string, number> = {};
    for (const a of [...handler.nightAbilities, ...handler.dayAbilities]) {
      if (a.usesLimit !== null) uses[a.key] = a.usesLimit;
    }
    events.push({ type: "roles.assigned", payload: { playerId: player.id, roleKey, faction: def.faction, uses } });
  });
  events.push({ type: "phase.started", payload: { phase: "day_1", dayNumber: 1 } });
  return ok(events);
}
