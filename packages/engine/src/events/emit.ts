import type { EventInput, GameEventEnvelope, Visibility } from "../types/events.js";
import type { PlayerId } from "../types/ids.js";

const priv = (audience: PlayerId) => ({ visibility: "private" as Visibility, audiencePlayerId: audience });
const pub = { visibility: "public" as Visibility, audiencePlayerId: null };

/** Visibilidad de cada evento. Es la única fuente de esta regla. */
export function visibilityOf(event: EventInput): { visibility: Visibility; audiencePlayerId: PlayerId | null } {
  switch (event.type) {
    case "roles.assigned":
      return priv(event.payload.playerId);
    case "night.action.submitted":
    case "night.action.blocked":
      return priv(event.payload.actorId);
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
      return priv(event.payload.trapperId);
    case "attack.prevented":
      return priv(event.payload.protectorId);
    case "chat.message":
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
