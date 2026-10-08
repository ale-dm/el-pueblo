/** Resultado de una decisión del motor: eventos aceptados o un error legible. Nunca lanza por reglas. */
export type Result<T, E = EngineError> = { ok: true; value: T } | { ok: false; error: E };

export interface EngineError {
  code: "invalid_command" | "wrong_phase" | "unknown_player" | "not_implemented";
  message: string;
}

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const err = (code: EngineError["code"], message: string): Result<never> => ({
  ok: false,
  error: { code, message },
});
