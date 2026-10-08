import type { GameEventEnvelope, Visibility } from "../types/events.js";
import type { PlayerState } from "../types/state.js";

/**
 * ¿Puede este jugador ver este evento?
 * - public: todos.
 * - mafia: jugadores vivos de la Mafia.
 * - dead: jugadores muertos.
 * - private: solo el destinatario (audiencePlayerId).
 */
export function canSee(
  event: Pick<GameEventEnvelope, "visibility" | "audiencePlayerId">,
  viewer: PlayerState,
): boolean {
  const rule: Record<Visibility, () => boolean> = {
    public: () => true,
    mafia: () => viewer.faction === "mafia" && viewer.status === "alive",
    dead: () => viewer.status === "dead",
    private: () => event.audiencePlayerId === viewer.id,
  };
  return rule[event.visibility]();
}

/** Eventos que el jugador puede ver, en el mismo orden. */
export function projectFor<E extends Pick<GameEventEnvelope, "visibility" | "audiencePlayerId">>(
  events: readonly E[],
  viewer: PlayerState,
): E[] {
  return events.filter((e) => canSee(e, viewer));
}
