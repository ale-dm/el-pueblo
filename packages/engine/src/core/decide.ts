import type { Catalog } from "../types/catalog.js";
import type { Command } from "../types/commands.js";
import type { GameEventEnvelope } from "../types/events.js";
import type { GameState } from "../types/state.js";
import type { Rng } from "./rng.js";
import { err, type Result } from "./result.js";

export interface EngineContext {
  catalog: Catalog;
  rng: Rng;
  /** Tiempo de referencia para cálculos de plazos. El motor no lee el reloj. */
  now: Date;
}

/**
 * (estado, comando) → eventos. Función pura: no hace I/O ni lee el reloj.
 * BORRADOR: solo se implementan los comandos que tienen su checklist en docs/CHECKLIST.md.
 */
export function decide(
  state: GameState,
  command: Command,
  _ctx: EngineContext,
): Result<GameEventEnvelope[]> {
  switch (command.type) {
    case "vote":
    case "night.action":
    case "chat.send":
    case "timer.expired":
      return err("not_implemented", `Comando "${command.type}" pendiente (M1). Ver docs/CHECKLIST.md §1.2–1.6.`);
    default: {
      const never: never = command;
      return err("invalid_command", `Comando desconocido: ${JSON.stringify(never)}`);
    }
  }
}
