import { describe, expect, it } from "vitest";
import type { GameEventEnvelope } from "@el-pueblo/engine";
import { createTestApp } from "../helpers/testApp.js";

describe("reconnect", () => {
  it("devuelve solo los eventos que el jugador puede ver y marca la conexión", async () => {
    const app = createTestApp();
    const host = await app.services.createRoom({ nick: "Ana" });
    const guest = await app.services.joinRoom({ roomCode: host.roomCode, nick: "Bea" });

    const log: GameEventEnvelope[] = [
      { seq: 1, type: "phase.started", payload: { phase: "discussion", dayNumber: 1 }, visibility: "public", audiencePlayerId: null },
      { seq: 2, type: "chat.message", payload: { channel: "mafia", senderId: host.playerId, text: "secreto" }, visibility: "mafia", audiencePlayerId: null },
      { seq: 3, type: "investigation.result", payload: { investigatorId: guest.playerId, targetId: host.playerId, result: "suspicious" }, visibility: "private", audiencePlayerId: guest.playerId },
      { seq: 4, type: "investigation.result", payload: { investigatorId: host.playerId, targetId: guest.playerId, result: "innocent" }, visibility: "private", audiencePlayerId: host.playerId },
    ];
    await app.events.append(host.matchId, 0, log);
    await app.players.update({ ...(await app.players.listByMatch(host.matchId))[1]!, connected: false });

    const result = await app.services.reconnect({ matchId: host.matchId, token: guest.token });

    expect(result.playerId).toBe(guest.playerId);
    // Bea es de Town (sin bando asignado aún): ve lo público y su propio resultado, no el chat de la mafia ni el de Ana.
    expect(result.events.map((e) => e.seq)).toEqual([1, 3]);
    const guestRecord = (await app.players.listByMatch(host.matchId)).find((p) => p.id === guest.playerId);
    expect(guestRecord?.connected).toBe(true);
  });

  it("rechaza un token inválido", async () => {
    const app = createTestApp();
    const host = await app.services.createRoom({ nick: "Ana" });
    await expect(app.services.reconnect({ matchId: host.matchId, token: "falso" })).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});
