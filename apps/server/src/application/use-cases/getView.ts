import { ROLE_HANDLERS, replay, type Catalog, type GameState } from "@el-pueblo/engine";
import { AppError } from "../errors.js";
import type { CatalogSource, EventLog, MatchStore, PlayerStore, Security } from "../ports.js";
import { initialState } from "../state/initialState.js";

export interface GetViewDeps {
  matches: MatchStore;
  players: PlayerStore;
  events: EventLog;
  catalog: CatalogSource;
  security: Security;
}

export interface PublicPlayer {
  id: string;
  seat: number;
  nick: string;
  status: string;
  connected: boolean;
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
    const history = await deps.events.read(match.id);
    const state = replay(initialState(match, roster), history);
    cachedCatalog ??= deps.catalog.load();
    const catalog = await cachedCatalog;

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
      players: state.players.map((p) => ({
        id: p.id,
        seat: p.seat,
        nick: p.nick,
        status: p.status,
        connected: p.connected,
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
