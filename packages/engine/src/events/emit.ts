import type { EventInput, GameEventEnvelope, Visibility } from "../types/events.js";
import type { PlayerId } from "../types/ids.js";

const priv = (audience: PlayerId) => ({ visibility: "private" as Visibility, audiencePlayerId: audience });
const pub = { visibility: "public" as Visibility, audiencePlayerId: null };

/** Visibilidad de cada evento. Es la única fuente de esta regla. */
export function visibilityOf(event: EventInput): { visibility: Visibility; audiencePlayerId: PlayerId | null } {
  switch (event.type) {
    case "roles.assigned":
      return priv(event.payload.playerId);
    case "role.promoted":
      // Lo sabe toda la Mafia viva: el ascendido ya es miembro del equipo.
      return { visibility: "mafia" as Visibility, audiencePlayerId: null };
    case "night.action.submitted":
    case "night.action.cancelled":
      // La Mafia ve las decisiones de sus miembros (wiki: Mafia y Coven ven las decisiones de sus compañeros).
      return event.payload.mafiaTeam ? { visibility: "mafia" as Visibility, audiencePlayerId: null } : priv(event.payload.actorId);
    case "night.action.blocked":
      return priv(event.payload.actorId);
    case "uses.left":
      return priv(event.payload.playerId);
    case "clean.revealed":
      return priv(event.payload.janitorId);
    case "night.notice":
      return priv(event.payload.playerId);
    case "will.written":
      return priv(event.payload.playerId);
    case "death.note.authored":
      return priv(event.payload.authorId);
    case "death.note.written":
      return pub;
    case "hypnosis.message":
      return priv(event.payload.playerId);
    case "will.forged":
      return priv(event.payload.forgerId);
    case "investigation.result":
      return priv(event.payload.investigatorId);
    case "ability.used":
      return priv(event.payload.playerId);
    case "effect.applied":
      return priv(event.payload.actorId);
    case "effect.cleared":
      // Ningún jugador lo ve: que un rol investigativo haya investigado a alguien es información privada del investigador.
      return { visibility: "private" as Visibility, audiencePlayerId: null };
    case "player.blackmailed":
      return priv(event.payload.targetId);
    case "player.jailed":
      return priv(event.payload.playerId);
    case "trap.placed":
    case "trap.removed":
    case "trap.built":
    case "trap.triggered":
    case "trap.status":
      return priv(event.payload.trapperId);
    case "attack.prevented":
      return priv(event.payload.protectorId);
    case "chat.refused":
      return priv(event.payload.playerId);
    case "chat.message":
      if (event.payload.channel === "whisper" || event.payload.channel === "jail" || event.payload.channel === "seance") {
        return priv(event.payload.audienceId ?? event.payload.senderId);
      }
      // Ultratumba: los muertos lo ven; con audiencia, solo esa copia (el Médium vivo que escucha a los muertos).
      if (event.payload.channel === "dead" && event.payload.audienceId) return priv(event.payload.audienceId);
      return {
        visibility: event.payload.channel === "public" ? "public" : event.payload.channel,
        audiencePlayerId: null,
      };
    default:
      return pub;
  }
}

/** Numera eventos a partir de `lastSeq` y les asigna visibilidad. */
export function emit(lastSeq: number, inputs: readonly EventInput[]): GameEventEnvelope[] {
  return inputs.map((input, i) => ({
    seq: lastSeq + i + 1,
    type: input.type,
    payload: input.payload,
    ...visibilityOf(input),
  }) as GameEventEnvelope);
}
