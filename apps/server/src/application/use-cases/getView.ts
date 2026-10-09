import { ROLE_HANDLERS, replay, type Catalog, type GameState } from "@el-pueblo/engine";
import { AppError } from "../errors.js";
import type { CatalogSource, Clock, EventLog, MatchStore, PlayerStore, Security } from "../ports.js";
import { initialState } from "../state/initialState.js";
import { modeOf, phaseDelayFor } from "../timing.js";

export interface GetViewDeps {
  matches: MatchStore;
  players: PlayerStore;
  events: EventLog;
  catalog: CatalogSource;
  security: Security;
  clock: Clock;
}

export interface PublicPlayer {
  id: string;
  seat: number;
  nick: string;
  status: string;
  connected: boolean;
  isBot: boolean;
  /** Compañero de Mafia visible para quien mira (la Mafia se conoce entre sí). */
  ally: boolean;
  /** Rol revelado tras morir (si el registro lo muestra). */
  revealedRoleKey: string | null;
}

/** Lo que un jugador puede ver de la partida: lo público, su propio rol y sus acciones. */
export interface MatchView {
  matchId: string;
  roomCode: string;
  status: string;
  phase: GameState["phase"];
  dayNumber: number;
  defendantId: string | null;
  winner: string | null;
  /** Cuándo termina el temporizador de la fase actual (ISO), o null si no tiene. */
  phaseEndsAt: string | null;
  /** Roles que hay en la partida (claves, ordenadas). Es información pública, como en la lista de roles de ToS. */
  rolesInGame: string[];
  players: PublicPlayer[];
  votes: Record<string, string | null>;
  verdicts: Record<string, "guilty" | "innocent">;
  me: {
    id: string;
    seat: number;
    nick: string;
    status: string;
    roleKey: string | null;
    roleName: string | null;
    faction: string | null;
    roleSummary: string | null;
    flags: Record<string, boolean>;
    nightAction: { ability: string; targetId: string | null } | null;
    /** Habilidades disponibles ahora mismo (con usos restantes). */
    nightAbilities: Array<{ key: string; target: string; usesLeft: number | null }>;
    dayAbilities: Array<{ key: string; target: string; oncePerDay: boolean; usesLeft: number | null }>;
  };
}

/** Vista por jugador. Calcula desde el registro: nada que no pueda ver el jugador sale de aquí. */
export function getView(deps: GetViewDeps) {
  let cachedCatalog: Promise<Catalog> | null = null;
  return async (input: { matchId: string; token: string }): Promise<MatchView> => {
    const match = await deps.matches.findById(input.matchId);
    if (!match) throw new AppError("not_found", "Partida no encontrada");
    const viewer = await deps.players.findByTokenHash(match.id, deps.security.hashToken(input.token));
    if (!viewer) throw new AppError("forbidden", "Token no válido para esta partida");

    const roster = await deps.players.listByMatch(match.id);
    const timed = await deps.events.readTimed(match.id);
    const history = timed.map((t) => t.event);
    const state = replay(initialState(match, roster), history);
    cachedCatalog ??= deps.catalog.load();
    const catalog = await cachedCatalog;

    // Fin del temporizador: inicio de la fase actual + lo que duraba (una votación reanudada, lo que le quedaba).
    const lastStart = timed.map((t) => t.event.type).lastIndexOf("phase.started");
    let phaseEndsAt: string | null = null;
    if (match.status === "playing" && lastStart >= 0) {
      const delay = phaseDelayFor(catalog, modeOf(match.config), state.phase, state.dayNumber, timed.slice(0, lastStart));
      if (delay !== null) phaseEndsAt = new Date(timed[lastStart]!.at.getTime() + delay).toISOString();
    }
    const rolesInGame = roster.map((p) => p.roleKey).filter((k): k is string => k !== null).sort();

    const revealed = new Map<string, string>();
    for (const e of history) {
      if ((e.type === "player.killed" || e.type === "player.hanged") && e.payload.roleKey) {
        revealed.set(e.payload.playerId, e.payload.roleKey);
      }
    }

    const me = state.players.find((p) => p.id === viewer.id);
    if (!me) throw new AppError("not_found", "Jugador no encontrado en la partida");
    const handler = me.roleKey ? ROLE_HANDLERS.get(me.roleKey) : undefined;
    const roleDef = me.roleKey ? catalog.roles.get(me.roleKey) : undefined;
    const alive = me.status === "alive";

    return {
      matchId: match.id,
      roomCode: match.roomCode,
      status: match.status,
      phase: state.phase,
      dayNumber: state.dayNumber,
      defendantId: state.defendantId,
      winner: state.winner,
      phaseEndsAt,
      rolesInGame,
      players: state.players.map((p) => ({
        id: p.id,
        seat: p.seat,
        nick: p.nick,
        status: p.status,
        connected: p.connected,
        isBot: roster.find((r) => r.id === p.id)?.isBot ?? false,
        ally: me.faction === "mafia" && p.faction === "mafia" && p.id !== me.id,
        revealedRoleKey: revealed.get(p.id) ?? null,
      })),
      votes: state.votes,
      verdicts: state.verdicts,
      me: {
        id: me.id,
        seat: me.seat,
        nick: me.nick,
        status: me.status,
        roleKey: me.roleKey,
        roleName: roleDef?.name ?? null,
        faction: me.faction,
        roleSummary: roleDef?.summary ?? null,
        flags: { ...me.flags },
        nightAction: state.nightActions[me.id] ?? null,
        nightAbilities: alive && handler
          ? handler.nightAbilities.map((a) => ({ key: a.key, target: a.target, usesLeft: a.usesLimit === null ? null : me.usesLeft[a.key] ?? 0 }))
          : [],
        dayAbilities: alive && handler
          ? handler.dayAbilities.map((a) => ({ key: a.key, target: a.target, oncePerDay: a.oncePerDay, usesLeft: a.usesLimit === null ? null : me.usesLeft[a.key] ?? 0 }))
          : [],
      },
    };
  };
}
