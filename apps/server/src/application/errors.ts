/** Errores de la capa de aplicación. El código es estable: el servidor lo traduce a Socket.IO o HTTP. */
export type AppErrorCode =
  | "not_found"
  | "forbidden"
  | "invalid_input"
  | "invalid_state"
  | "conflict"
  | "engine_rejected";

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** Lanzado por EventLog.append cuando otro escritor avanzó la secuencia antes. */
export class ConcurrencyError extends Error {
  constructor(message = "La secuencia de eventos cambió mientras se escribía") {
    super(message);
    this.name = "ConcurrencyError";
  }
}
