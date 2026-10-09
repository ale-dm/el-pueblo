import type { Catalog, GameEventEnvelope, Phase } from "@el-pueblo/engine";
import type { TimedEvent } from "./ports.js";

/** Mínimo de una votación reanudada: evita un temporizador de 0 si ya casi no quedaba tiempo. */
const MIN_RESUMED_VOTING_MS = 1000;

/** Milisegundos de cada fase según el modo de la partida. Null si la fase no tiene temporizador. */
export function phaseDelayMs(catalog: Catalog, mode: string, phase: Phase): number | null {
  const row = catalog.phaseTimings.find((t) => t.mode === mode && t.phase === phase);
  return row?.seconds == null ? null : row.seconds * 1000;
}

/** Modo de la partida: el de su configuración, o "standard". */
export function modeOf(config: Record<string, unknown>): string {
  return typeof config.mode === "string" ? config.mode : "standard";
}

type PhaseStart = TimedEvent & { event: Extract<GameEventEnvelope, { type: "phase.started" }> };

/**
 * Tiempo de votación ya gastado en un día. Tras un juicio sin condena, la wiki dice que la votación
 * "continúa con el tiempo que quedaba": cada tramo de votación dura desde su phase.started hasta el siguiente.
 * Si se pasa `now`, cuenta también el tramo abierto (para recuperar un temporizador tras un reinicio).
 */
export function votingSpentMs(timed: readonly TimedEvent[], dayNumber: number, now?: Date): number {
  const starts = timed.filter((t): t is PhaseStart => t.event.type === "phase.started");
  let spent = 0;
  starts.forEach((start, i) => {
    const { phase, dayNumber: day } = start.event.payload;
    if (phase !== "voting" || day !== dayNumber) return;
    const end = starts[i + 1]?.at ?? now;
    if (end) spent += Math.max(0, end.getTime() - start.at.getTime());
  });
  return spent;
}

/** Milisegundos hasta que termina la fase que empieza. Una votación reanudada solo tiene lo que le quedaba. */
export function phaseDelayFor(
  catalog: Catalog,
  mode: string,
  phase: Phase,
  dayNumber: number,
  timed: readonly TimedEvent[],
  now?: Date,
): number | null {
  const full = phaseDelayMs(catalog, mode, phase);
  if (full === null || phase !== "voting") return full;
  return Math.max(full - votingSpentMs(timed, dayNumber, now), MIN_RESUMED_VOTING_MS);
}
