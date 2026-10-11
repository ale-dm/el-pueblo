/**
 * Tarea de un temporizador (fase, bots, elección de nombres). Un temporizador se dispara sin que nadie espere su
 * resultado: si falla, el error se registra con la partida a la que pertenece. Nunca se deja sin manejar, porque en
 * Node una promesa rechazada sin manejador tumba el proceso entero, con todas las salas.
 */
export function timerTask(
  label: string,
  matchId: string,
  task: () => Promise<unknown>,
  log: (message: string, detail: unknown) => void = (message, detail) => console.error(`[server] ${message}`, detail),
): () => void {
  return () => {
    task().catch((error: unknown) => log(`temporizador ${label} de la partida ${matchId} falló`, error));
  };
}
