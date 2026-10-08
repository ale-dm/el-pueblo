import type { Server } from "socket.io";
import { projectFor, type GameEventEnvelope } from "@el-pueblo/engine";
import type { Broadcaster, PlayerStore } from "../../../application/ports.js";

/** Qué socket pertenece a qué jugador de qué partida. Lo mantiene el gateway al entrar y salir. */
export class ViewerRegistry {
  private readonly bySocket = new Map<string, { matchId: string; playerId: string }>();

  attach(socketId: string, matchId: string, playerId: string) {
    this.bySocket.set(socketId, { matchId, playerId });
  }

  detach(socketId: string) {
    const viewer = this.bySocket.get(socketId);
    this.bySocket.delete(socketId);
    return viewer;
  }

  of(matchId: string): Array<{ socketId: string; playerId: string }> {
    return [...this.bySocket.entries()]
      .filter(([, v]) => v.matchId === matchId)
      .map(([socketId, v]) => ({ socketId, playerId: v.playerId }));
  }
}

/** Entrega cada evento solo a los sockets que pueden verlo (proyección por jugador). */
export class SocketIoBroadcaster implements Broadcaster {
  constructor(
    private readonly io: Server,
    private readonly players: PlayerStore,
    private readonly viewers: ViewerRegistry,
  ) {}

  async publish(matchId: string, events: GameEventEnvelope[]) {
    const roster = await this.players.listByMatch(matchId);
    for (const { socketId, playerId } of this.viewers.of(matchId)) {
      const viewer = roster.find((p) => p.id === playerId);
      if (!viewer) continue;
      const visible = projectFor(events, viewer);
      if (visible.length > 0) this.io.to(socketId).emit("match:events", visible);
    }
  }
}
