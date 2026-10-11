import type { Scheduler } from "../ports.js";
import { ConcurrencyError } from "../errors.js";

/** Fase para la que se arma un temporizador: si la partida ya está en otra, el temporizador no avanza nada. */
export interface ArmedPhase {
  phase: string;
  dayNumber: number;
}

export interface TimerSpec {
  /** Clave del planificador: una por partida (y otra para la elección de nombres). */
  key: string;
  matchId: string;
  /** Qué temporizador es, para el registro ("fase", "bots", "elección de nombres"). */
  label: string;
}

/** Reintentos de los fallos transitorios (red, base de datos ocupada). Un fallo del motor no se reintenta. */
export const RETRY = { maxAttempts: 4, baseMs: 1000 } as const;

const TRANSIENT_CODES = new Set(["40001", "40P01", "57P01", "57P02", "57P03", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE"]);

/**
 * Fallo que puede pasar solo: conflicto de escritura, conexión caída o base de datos ocupada (clases 08 y 57 de
 * PostgreSQL, y errores de red). Una restricción violada o un fallo del motor no lo son: repetirlos no arregla nada.
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof ConcurrencyError) return true;
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code !== "string") return false;
  return code.startsWith("08") || TRANSIENT_CODES.has(code);
}

/**
 * Arma un temporizador. Si la tarea falla por algo transitorio, la reintenta con espera creciente. Si falla por otra
 * cosa, registra el error con la partida y no la reintenta: el vigilante (recoverTimers) lo volverá a armar. Nunca deja
 * una promesa sin manejar, porque en Node eso tumba el proceso entero.
 */
export function armTimer(scheduler: Scheduler, spec: TimerSpec, delayMs: number, task: () => Promise<unknown>, attempt = 0): void {
  scheduler.schedule(spec.key, delayMs, () => {
    task().catch((error: unknown) => {
      if (isTransientError(error) && attempt < RETRY.maxAttempts) {
        const wait = RETRY.baseMs * 2 ** attempt;
        console.error(`[server] temporizador ${spec.label} de la partida ${spec.matchId} falló (transitorio); reintento ${attempt + 1} en ${wait} ms`, error);
        armTimer(scheduler, spec, wait, task, attempt + 1);
        return;
      }
      const after = attempt > 0 ? " tras reintentar" : "";
      console.error(`[server] temporizador ${spec.label} de la partida ${spec.matchId} falló${after}; lo volverá a armar el vigilante`, error);
    });
  });
}
