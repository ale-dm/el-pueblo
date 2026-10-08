import type { Catalog, Phase } from "@el-pueblo/engine";

/** Milisegundos de cada fase según el modo de la partida. Null si la fase no tiene temporizador. */
export function phaseDelayMs(catalog: Catalog, mode: string, phase: Phase): number | null {
  const row = catalog.phaseTimings.find((t) => t.mode === mode && t.phase === phase);
  return row?.seconds == null ? null : row.seconds * 1000;
}

/** Modo de la partida: el de su configuración, o "standard". */
export function modeOf(config: Record<string, unknown>): string {
  return typeof config.mode === "string" ? config.mode : "standard";
}
