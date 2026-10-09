import { ROLE_HANDLERS, replay, type Catalog, type GameState, type NightAbility } from "@el-pueblo/engine";
import { AppError } from "../errors.js";
import type { CatalogSource, Clock, EventLog, MatchStore, PlayerStore, Security } from "../ports.js";
import { initialState } from "../state/initialState.js";
import { modeOf, phaseDelayFor } from "../timing.js";


/** Flags de una habilidad de noche que la app necesita para pintar su entrada: nota de muerte, elección por defecto y testamento falsificado. */
export function nightAbilityFlags(a: NightAbility): { deathNote: boolean; defaultChoice: string | null; writesWill: boolean } {
  return { deathNote: a.deathNote ?? false, defaultChoice: a.defaultChoice ?? null, writesWill: a.writesWill ?? false };
}

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
  /** Mayor que se ha revelado (público: el evento mayor.revealed es para todos). Limita los susurros. */
  mayorRevealed: boolean;
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
  /** Roles que hay en la partida, con su grupo (alineamiento). Público, como la lista de roles de ToS. */
  rolesInGame: Array<{ key: string; alignment: string | null }>;
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
    /** Cuerpos que el Retributionist ya usó (solo para él). */
    usedBodies: string[];
    nightAction: { ability: string; targetId: string | null; secondTargetId?: string | null; choice?: string | null; note?: string; forgedWill?: string } | null;
    /** Sesión de Médium esta noche: "medium" (la abre el Médium muerto) o "target" (el vivo elegido). */
    seance: "medium" | "target" | null;
    /** Tu última voluntad (solo tú la ves mientras vives). */
    will: string | null;
    /** Grupo del rol (alineamiento del catálogo, p. ej. town_support). */
    alignment: string | null;
    /** Si estás encarcelando a alguien o estás encarcelado esta noche (canal privado del Jailor). */
    jail: "jailor" | "prisoner" | null;
    /** Ataque y defensa del rol, tal como los da el catálogo (con sus condiciones). */
    attack: string | null;
    defense: string | null;
    /** Habilidades disponibles ahora mismo (con usos restantes). */
    nightAbilities: Array<{ key: string; target: string; usesLeft: number | null; choices: string[] | null; deadOnly: boolean; deathNote: boolean; defaultChoice: string | null; writesWill: boolean }>;
    dayAbilities: Array<{ key: string; target: string; oncePerDay: boolean; usesLeft: number | null }>;
  };
}

/** Vista por jugador. Calcula desde el registro: nada que no pueda ver el jugador sale de aquí. */
/** Cuerpos ya usados por el Retributionist: solo para quien es Retributionist (wiki: Retributionist.md:204). */
export function usedBodiesFor(roleKey: string | null, players: ReadonlyArray<{ id: string; status: string; flags: { zombied?: boolean } }>): string[] {
  if (roleKey !== "retributionist") return [];
  return players.filter((p) => p.status !== "alive" && p.flags.zombied === true).map((p) => p.id);
}

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
    const rolesInGame = roster
      .map((p) => p.roleKey)
      .filter((k): k is string => k !== null)
      .sort()
      .map((key) => ({ key, alignment: catalog.roles.get(key)?.alignmentKey ?? null }));

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
    // Sesión de Médium: el Médium (muerto) la abre; el vivo elegido recibe el canal anónimo.
    const seance: "medium" | "target" | null = state.phase !== "night" ? null
      : state.nightActions[me.id]?.ability === "seance" ? "medium"
      : Object.values(state.nightActions).some((a) => a.ability === "seance" && a.targetId === me.id) ? "target"
      : null;

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
        mayorRevealed: p.flags.mayorRevealed === true,
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
        // Cuerpos ya usados por el Retributionist (wiki: Retributionist.md:204, el icono junto al muerto). Solo lo ve él.
        usedBodies: usedBodiesFor(me.roleKey, state.players),
        nightAction: state.nightActions[me.id] ?? null,
        seance,
        will: state.wills[me.id] ?? null,
        alignment: me.roleKey ? catalog.roles.get(me.roleKey)?.alignmentKey ?? null : null,
        jail: Object.values(state.jailedBy).includes(me.id) ? "jailor" : state.jailedBy[me.id] ? "prisoner" : null,
        attack: me.roleKey ? catalog.roles.get(me.roleKey)?.attack ?? null : null,
        defense: me.roleKey ? catalog.roles.get(me.roleKey)?.defense ?? null : null,
        // Los vivos tienen sus habilidades de noche; los muertos, solo las de muerto (Medium).
        nightAbilities: handler
          ? handler.nightAbilities
              .filter((a) => (alive ? !a.deadOnly : a.deadOnly))
              .map((a) => ({
                key: a.key,
                target: a.target,
                usesLeft: a.usesLimit === null ? null : me.usesLeft[a.key] ?? 0,
                choices: a.choices === "roles" ? [...ROLE_HANDLERS.keys()] : a.choices ? [...a.choices] : null,
                deadOnly: a.deadOnly ?? false,
                ...nightAbilityFlags(a),
              }))
          : [],
        // Los vivos tienen sus habilidades de día; los muertos, solo las de muerto (Medium abre su sesión de día).
        dayAbilities: handler
          ? handler.dayAbilities
              .filter((a) => (alive ? !a.deadOnly : a.deadOnly))
              .map((a) => ({ key: a.key, target: a.target, oncePerDay: a.oncePerDay, usesLeft: a.usesLimit === null ? null : me.usesLeft[a.key] ?? 0 }))
          : [],
      },
    };
  };
}
