import type { GameEventEnvelope } from "@el-pueblo/engine";

/**
 * Lo que la base de datos exige de un evento antes de guardarlo (migración 0000; check events_private_needs_audience):
 * lo privado tiene un destinatario. Los almacenes lo comprueban igual, para que un fallo del motor salga en las pruebas
 * y no en producción con la partida parada.
 */
export function assertStorable(events: readonly GameEventEnvelope[]): void {
  for (const event of events) {
    if (event.visibility === "private" && !event.audiencePlayerId) {
      throw new Error(`Evento privado sin destinatario: ${event.type}`);
    }
  }
}
