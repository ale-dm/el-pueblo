import { io, type Socket } from "socket.io-client";

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type Ack<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

let socket: Socket | null = null;

/** Conexión única. En desarrollo pasa por el proxy de Vite; en producción, por el mismo origen. */
export function getSocket(): Socket {
  socket ??= io({ transports: ["websocket"] });
  return socket;
}

/** Llamada con respuesta (ack). Lanza ApiError si el servidor rechaza la petición. */
export function call<T>(event: string, payload: unknown): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    getSocket().emit(event, payload, (response: Ack<T>) => {
      if (response.ok) resolve(response.data);
      else reject(new ApiError(response.error.code, response.error.message));
    });
  });
}
