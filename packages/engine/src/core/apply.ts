import type { GameEventEnvelope } from "../types/events.js";
import { BLACKMAIL_LINE } from "../rules/chat.js";
import type { GameState, PlayerFlag, PlayerState } from "../types/state.js";

/**
 * Reducer: (estado, evento) → estado nuevo. Función pura y determinista.
 * Replay de una partida = aplicar sus eventos en orden sobre el estado inicial.
 */
export function apply(state: GameState, event: GameEventEnvelope): GameState {
  return { ...applyBody(state, event), seq: event.seq };
}

const updatePlayer = (s: GameState, id: string, fn: (p: PlayerState) => PlayerState): GameState => ({
  ...s,
  players: s.players.map((p) => (p.id === id ? fn(p) : p)),
});

const setFlag = (s: GameState, id: string, flag: PlayerFlag, on: boolean): GameState =>
  updatePlayer(s, id, (p) => {
    const flags = { ...p.flags };
    if (on) flags[flag] = true;
    else delete flags[flag];
    return { ...p, flags };
  });

function applyBody(s: GameState, e: GameEventEnvelope): GameState {
  switch (e.type) {
    case "roles.assigned":
      return updatePlayer(s, e.payload.playerId, (p) => ({
        ...p,
        roleKey: e.payload.roleKey,
        faction: e.payload.faction,
        usesLeft: { ...e.payload.uses },
      }));

    case "role.promoted":
      return updatePlayer(s, e.payload.playerId, (p) => ({ ...p, roleKey: e.payload.roleKey, usesLeft: { ...e.payload.uses } }));

    case "phase.started": {
      const { phase, dayNumber } = e.payload;
      const base: GameState = { ...s, phase, dayNumber };
      switch (phase) {
        case "day_1":
        case "discussion":
          return { ...base, trialsToday: 0, votes: {}, verdicts: {}, defendantId: null };
        case "voting":
          return { ...base, votes: {}, defendantId: null };
        case "night":
          return {
            ...base,
            // Se borran las acciones de la noche anterior; la sesión de Médium abierta de día sobrevive al amanecer.
            nightActions: Object.fromEntries(Object.entries(s.nightActions).filter(([, a]) => a.ability === "seance")),
            defendantId: null,
            players: s.players.map((p) => ({ ...p, flags: without(p.flags, "blackmailed") })),
          };
        default:
          return base;
      }
    }

    case "vote.cast":
      return { ...s, votes: { ...s.votes, [e.payload.voterId]: e.payload.targetId } };

    case "trial.started":
      // Cada juicio empieza sin "I am blackmailed." dicho (wiki: Blackmailer.md:213).
      return {
        ...s,
        defendantId: e.payload.defendantId,
        trialsToday: s.trialsToday + 1,
        verdicts: {},
        players: s.players.map((p) => (p.flags.blackmailSpoke ? { ...p, flags: without(p.flags, "blackmailSpoke") } : p)),
      };

    case "chat.message": {
      // El acusado silenciado ya dijo su frase en este juicio.
      const sender = s.players.find((p) => p.id === e.payload.senderId);
      if (e.payload.channel === "public" && e.payload.text === BLACKMAIL_LINE && sender?.flags.blackmailed) {
        return setFlag(s, e.payload.senderId, "blackmailSpoke", true);
      }
      return s;
    }

    case "judgement.cast":
      return { ...s, verdicts: { ...s.verdicts, [e.payload.voterId]: e.payload.verdict } };

    case "will.forged":
      return { ...s, forgeries: { ...s.forgeries, [e.payload.playerId]: e.payload.role } };

    case "will.written": {
      const wills = { ...s.wills };
      if (e.payload.text) wills[e.payload.playerId] = e.payload.text;
      else delete wills[e.payload.playerId];
      return { ...s, wills };
    }

    case "night.action.cancelled": {
      const nightActions = { ...s.nightActions };
      delete nightActions[e.payload.actorId];
      return { ...s, nightActions };
    }

    case "player.hanged":
    case "player.killed": {
      const cause = e.type === "player.hanged" ? "hanged" : e.payload.cause;
      return updatePlayer(s, e.payload.playerId, (p) => ({ ...p, status: "dead", deathReason: cause }));
    }

    case "night.action.submitted":
      return {
        ...s,
        nightActions: {
          ...s.nightActions,
          [e.payload.actorId]: {
            ability: e.payload.ability,
            targetId: e.payload.targetId,
            secondTargetId: e.payload.secondTargetId,
            choice: e.payload.choice,
            ...(e.payload.note !== undefined ? { note: e.payload.note } : {}),
            ...(e.payload.forgedWill !== undefined ? { forgedWill: e.payload.forgedWill } : {}),
          },
        },
      };

    case "ability.used": {
      const dayActionDay = { ...s.dayActionDay, [e.payload.playerId]: s.dayNumber };
      return updatePlayer({ ...s, dayActionDay }, e.payload.playerId, (p) => {
        const left = p.usesLeft[e.payload.ability];
        if (left === undefined) return p;
        return { ...p, usesLeft: { ...p.usesLeft, [e.payload.ability]: Math.max(0, left - 1) } };
      });
    }

    case "effect.applied":
      return setFlag(s, e.payload.targetId, e.payload.flag, true);

    case "effect.cleared":
      return setFlag(s, e.payload.targetId, e.payload.flag, false);

    case "player.blackmailed":
      return setFlag(s, e.payload.targetId, "blackmailed", true);

    case "player.jailed":
      return { ...setFlag(s, e.payload.playerId, "jailed", true), jailedBy: { ...s.jailedBy, [e.payload.playerId]: e.payload.jailorId } };

    case "mayor.revealed":
      return setFlag(s, e.payload.playerId, "mayorRevealed", true);

    case "trap.placed":
      return { ...s, traps: { ...s.traps, [e.payload.trapperId]: { targetId: e.payload.targetId, readyDay: e.payload.readyDay } } };

    case "trap.built":
      return { ...s, traps: { ...s.traps, [e.payload.trapperId]: { targetId: null, readyDay: e.payload.readyDay } } };

    case "trap.removed": {
      const traps = { ...s.traps };
      delete traps[e.payload.trapperId];
      return { ...s, traps };
    }

    case "night.resolved":
      return {
        ...s,
        nightActions: {},
        // Las falsificaciones duran una noche (wiki: Forger).
        forgeries: {},
        // "cleaned" se conserva en los muertos (el Retributionist lo consulta); en los vivos caduca con la noche.
        players: s.players.map((p) => ({
          ...p,
          flags: p.status === "alive" ? without(without(without(p.flags, "alert"), "jailed"), "cleaned") : without(without(p.flags, "alert"), "jailed"),
        })),
        jailedBy: {},
      };

    case "game.ended":
      return { ...s, winner: e.payload.winner, phase: "ended" };

    default:
      return s;
  }
}

function without(flags: PlayerState["flags"], flag: PlayerFlag): PlayerState["flags"] {
  const next = { ...flags };
  delete next[flag];
  return next;
}
