import type { GameEventEnvelope } from "@el-pueblo/engine";
import type { NarrationFact } from "../ports.js";

/**
 * Hechos públicos de un lote de eventos. Solo se usan eventos de visibilidad pública:
 * un evento privado o de facción nunca llega al narrador.
 */
export function factsFromEvents(
  events: readonly GameEventEnvelope[],
  nickOf: (id: string) => string,
  roleOf: (roleKey: string) => string | null,
): NarrationFact[] {
  const facts: NarrationFact[] = [];
  const deaths: Array<{ nick: string; cause: string; role: string | null }> = [];
  const nightDay = { value: null as number | null };

  for (const e of events) {
    if (e.visibility !== "public") continue;
    switch (e.type) {
      case "phase.started":
        if (e.payload.phase === "discussion") facts.push({ kind: "day", dayNumber: e.payload.dayNumber });
        break;
      case "player.killed":
        deaths.push({
          nick: nickOf(e.payload.playerId),
          cause: e.payload.cause,
          role: e.payload.roleKey ? roleOf(e.payload.roleKey) : null,
        });
        break;
      case "night.resolved":
        nightDay.value = e.payload.dayNumber;
        break;
      case "trial.started":
        facts.push({ kind: "trial", defendant: nickOf(e.payload.defendantId) });
        break;
      case "trial.verdict":
        facts.push({ kind: "verdict", defendant: nickOf(e.payload.defendantId), verdict: e.payload.verdict });
        break;
      case "player.hanged":
        facts.push({ kind: "hanged", nick: nickOf(e.payload.playerId), role: e.payload.roleKey ? roleOf(e.payload.roleKey) : null });
        break;
      case "game.ended":
        facts.push({ kind: "ended", winner: e.payload.winner === "mafia" ? "mafia" : "town" });
        break;
      default:
        break;
    }
  }
  if (nightDay.value !== null) facts.unshift({ kind: "night", dayNumber: nightDay.value, deaths });
  return facts;
}
