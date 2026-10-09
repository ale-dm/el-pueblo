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
    case "will.written":
      return priv(event.payload.playerId);
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
    case "player.blackmailed":
      return priv(event.payload.targetId);
    case "player.jailed":
      return priv(event.payload.playerId);
    case "trap.placed":
    case "trap.removed":
      return priv(event.payload.trapperId);
    case "attack.prevented":
      return priv(event.payload.protectorId);
    case "chat.message":
      if (event.payload.channel === "whisper" || event.payload.channel === "jail" || event.payload.channel === "seance") {
        return priv(event.payload.audienceId ?? event.payload.senderId);
      }
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
