import type { Server, Socket } from "socket.io";
import type { Command } from "@el-pueblo/engine";
import { AppError } from "../../../application/errors.js";
import type { Services } from "../../../composition.js";
import type { ViewerRegistry } from "../../outbound/socket-io/broadcaster.js";
import type { RateLimiter } from "./rateLimit.js";

export type Ack = (response: { ok: true; data?: unknown } | { ok: false; error: { code: string; message: string } }) => void;

export interface GatewayDeps {
  services: Services;
  viewers: ViewerRegistry;
  chatLimiter: RateLimiter;
  createLimiter: RateLimiter;
  log: (message: string, detail?: unknown) => void;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const str = (v: unknown, field: string): string => {
  if (typeof v !== "string" || v.length === 0) throw new AppError("invalid_input", `Falta ${field}`);
  return v;
};

/** Número entero opcional: ausente equivale a 0. El rango lo valida el caso de uso. */
const count = (v: unknown, field: string): number => {
  if (v === undefined) return 0;
  if (typeof v !== "number" || !Number.isInteger(v)) throw new AppError("invalid_input", `${field} debe ser un número entero`);
  return v;
};

/** Traduce un error a respuesta para el cliente. Los errores inesperados no revelan detalles. */
function respond(ack: Ack | undefined, deps: GatewayDeps, fn: () => Promise<unknown>) {
  fn()
    .then((data) => ack?.({ ok: true, data }))
    .catch((error: unknown) => {
      if (error instanceof AppError) {
        ack?.({ ok: false, error: { code: error.code, message: error.message } });
        return;
      }
      deps.log("error inesperado", error);
      ack?.({ ok: false, error: { code: "internal", message: "Error interno" } });
    });
}

/** Rutas de Socket.IO: sala, partida y reconexión. Cada una responde con un ack. */
export function attachGateway(io: Server, deps: GatewayDeps) {
  const { services, viewers } = deps;

  io.on("connection", (socket: Socket) => {
    socket.on("room:create", (payload: unknown, ack?: Ack) =>
      respond(ack, deps, async () => {
        if (!deps.createLimiter.hit(socket.id)) throw new AppError("invalid_state", "Demasiadas salas seguidas");
        const body = isObject(payload) ? payload : {};
        const room = await services.createRoom({ nick: str(body.nick, "nick"), bots: count(body.bots, "bots") });
        viewers.attach(socket.id, room.matchId, room.playerId);
        return room;
      }),
    );

    socket.on("room:join", (payload: unknown, ack?: Ack) =>
      respond(ack, deps, async () => {
        const body = isObject(payload) ? payload : {};
        const joined = await services.joinRoom({
          roomCode: str(body.roomCode, "código de sala"),
          nick: str(body.nick, "nick"),
        });
        viewers.attach(socket.id, joined.matchId, joined.playerId);
        return joined;
      }),
    );

    socket.on("room:reconnect", (payload: unknown, ack?: Ack) =>
      respond(ack, deps, async () => {
        const body = isObject(payload) ? payload : {};
        const matchId = str(body.matchId, "partida");
        const view = await services.reconnect({ matchId, token: str(body.token, "token") });
        viewers.attach(socket.id, matchId, view.playerId);
        await services.setConnection(matchId, view.playerId, true);
        return view;
      }),
    );

    socket.on("match:start", (payload: unknown, ack?: Ack) =>
      respond(ack, deps, async () => {
        const body = isObject(payload) ? payload : {};
        return services.startMatch({ matchId: str(body.matchId, "partida"), token: str(body.token, "token") });
      }),
    );

    // Elección de nombres: el anfitrión la abre; cada jugador escribe el suyo mientras dura.
    socket.on("match:naming", (payload: unknown, ack?: Ack) =>
      respond(ack, deps, async () => {
        const body = isObject(payload) ? payload : {};
        return services.beginNaming({ matchId: str(body.matchId, "partida"), token: str(body.token, "token") });
      }),
    );

    socket.on("match:name", (payload: unknown, ack?: Ack) =>
      respond(ack, deps, async () => {
        const body = isObject(payload) ? payload : {};
        return services.chooseName({ matchId: str(body.matchId, "partida"), token: str(body.token, "token"), nick: str(body.nick, "nombre") });
      }),
    );

    socket.on("match:command", (payload: unknown, ack?: Ack) =>
      respond(ack, deps, async () => {
        const body = isObject(payload) ? payload : {};
        const command = body.command;
        if (!isObject(command) || typeof command.type !== "string") throw new AppError("invalid_input", "Comando no válido");
        if (command.type === "chat.send" && !deps.chatLimiter.hit(socket.id)) {
          throw new AppError("invalid_state", "Vas demasiado rápido: espera unos segundos");
        }
        return services.submitCommand({
          matchId: str(body.matchId, "partida"),
          token: str(body.token, "token"),
          command: command as unknown as Command,
        });
      }),
    );

    socket.on("match:view", (payload: unknown, ack?: Ack) =>
      respond(ack, deps, async () => {
        const body = isObject(payload) ? payload : {};
        return services.getView({ matchId: str(body.matchId, "partida"), token: str(body.token, "token") });
      }),
    );

    socket.on("push:key", (_payload: unknown, ack?: Ack) =>
      respond(ack, deps, async () => ({ publicKey: services.pushPublicKey() })),
    );

    socket.on("push:subscribe", (payload: unknown, ack?: Ack) =>
      respond(ack, deps, async () => {
        const body = isObject(payload) ? payload : {};
        const sub = isObject(body.subscription) ? body.subscription : {};
        const keys = isObject(sub.keys) ? sub.keys : {};
        await services.subscribePush({
          matchId: str(body.matchId, "partida"),
          token: str(body.token, "token"),
          endpoint: str(sub.endpoint, "suscripción"),
          p256dh: str(keys.p256dh, "clave p256dh"),
          auth: str(keys.auth, "clave auth"),
        });
        return { subscribed: true };
      }),
    );

    socket.on("disconnect", () => {
      const viewer = viewers.detach(socket.id);
      if (viewer) void services.setConnection(viewer.matchId, viewer.playerId, false);
    });
  });
}
