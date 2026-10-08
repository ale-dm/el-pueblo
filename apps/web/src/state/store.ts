import { create } from "zustand";
import { ApiError, call, getSocket } from "../net/socket.js";
import { loadSession, saveSession, type Session } from "./session.js";
import type { GameEvent, MatchView } from "../types.js";

const LOG_LIMIT = 200;

interface GameState {
  session: Session | null;
  view: MatchView | null;
  log: GameEvent[];
  connected: boolean;
  busy: boolean;
  error: string | null;
  init: () => void;
  createRoom: (nick: string) => Promise<void>;
  joinRoom: (roomCode: string, nick: string) => Promise<void>;
  startMatch: () => Promise<void>;
  send: (command: Record<string, unknown>) => Promise<void>;
  refresh: () => Promise<void>;
  leave: () => void;
  clearError: () => void;
}

function explain(error: unknown): string {
  if (error instanceof ApiError) return error.code === "forbidden" ? "Tu sesión ya no es válida. Vuelve a entrar a la sala." : error.message;
  return "No hay conexión con el servidor. Se reintentará al volver.";
}

export const useGame = create<GameState>((set, get) => {
  let started = false;

  const remember = (session: Session | null) => {
    saveSession(session);
    set({ session, ...(session ? {} : { view: null, log: [] }) });
  };

  /** Pide la vista actual. Si el servidor dice que la sesión no vale, la olvida. */
  const refresh = async () => {
    const session = get().session;
    if (!session) return;
    try {
      const view = await call<MatchView>("match:view", { matchId: session.matchId, token: session.token });
      set({ view });
    } catch (error) {
      if (error instanceof ApiError && error.code === "forbidden") remember(null);
      else throw error;
    }
  };

  /** Vuelve a entrar en la partida con el token guardado (tras recargar o perder la conexión). */
  const resume = async () => {
    const session = get().session;
    if (!session) return;
    try {
      await call("room:reconnect", { matchId: session.matchId, token: session.token });
      await refresh();
    } catch (error) {
      if (error instanceof ApiError && error.code === "forbidden") remember(null);
    }
  };

  const run = async (task: () => Promise<void>) => {
    set({ busy: true, error: null });
    try {
      await task();
    } catch (error) {
      set({ error: explain(error) });
    } finally {
      set({ busy: false });
    }
  };

  return {
    session: loadSession(),
    view: null,
    log: [],
    connected: false,
    busy: false,
    error: null,

    init: () => {
      if (started) return;
      started = true;
      const socket = getSocket();
      socket.on("connect", () => {
        set({ connected: true });
        void resume();
      });
      socket.on("disconnect", () => set({ connected: false }));
      socket.on("match:events", (batch: GameEvent[]) => {
        set((state) => ({ log: [...state.log, ...batch].slice(-LOG_LIMIT) }));
        void refresh().catch(() => undefined);
      });
      if (socket.connected) void resume();
    },

    createRoom: (nick) =>
      run(async () => {
        const room = await call<{ matchId: string; playerId: string; token: string; roomCode: string }>("room:create", { nick });
        remember({ matchId: room.matchId, playerId: room.playerId, token: room.token, roomCode: room.roomCode, nick });
        await refresh();
      }),

    joinRoom: (roomCode, nick) =>
      run(async () => {
        const code = roomCode.trim().toUpperCase();
        const joined = await call<{ matchId: string; playerId: string; token: string }>("room:join", { roomCode: code, nick });
        remember({ matchId: joined.matchId, playerId: joined.playerId, token: joined.token, roomCode: code, nick });
        await refresh();
      }),

    startMatch: () =>
      run(async () => {
        const session = get().session;
        if (!session) return;
        await call("match:start", { matchId: session.matchId, token: session.token });
        await refresh();
      }),

    send: (command) =>
      run(async () => {
        const session = get().session;
        if (!session) return;
        await call("match:command", { matchId: session.matchId, token: session.token, command });
      }),

    refresh: () => refresh(),

    leave: () => remember(null),

    clearError: () => set({ error: null }),
  };
});
