import { describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/testApp.js";

describe("autorización de comandos", () => {
  async function startedGame() {
    const app = createTestApp();
    const host = await app.services.createRoom({ nick: "P1" });
    const guests = [];
    for (let i = 2; i <= 10; i++) guests.push(await app.services.joinRoom({ roomCode: host.roomCode, nick: `P${i}` }));
    await app.services.startMatch({ matchId: host.matchId, token: host.token });
    return { app, host, guest: guests[0]! };
  }

  it("no se puede actuar como otro jugador", async () => {
    const { app, host, guest } = await startedGame();
    await expect(
      app.services.submitCommand({
        matchId: host.matchId,
        token: guest.token,
        command: { type: "chat.send", senderId: host.playerId, channel: "public", text: "hola" },
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("un cliente no puede forzar el paso de fase ni volver a repartir roles", async () => {
    const { app, host, guest } = await startedGame();
    await expect(
      app.services.submitCommand({ matchId: host.matchId, token: guest.token, command: { type: "timer.expired" } }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      app.services.submitCommand({
        matchId: host.matchId,
        token: host.token,
        command: { type: "game.start", hostId: host.playerId },
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("no se puede cambiar la nota de muerte de otro asesino (wiki: Death_Note_ToS.md:17)", async () => {
    const { app, host, guest } = await startedGame();
    await expect(
      app.services.submitCommand({
        matchId: host.matchId,
        token: guest.token,
        command: { type: "death.note.write", actorId: host.playerId, victimId: guest.playerId, note: "x" },
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("un jugador sí puede hablar con su propio nombre", async () => {
    const { app, host, guest } = await startedGame();
    const sent = await app.services.submitCommand({
      matchId: host.matchId,
      token: guest.token,
      command: { type: "chat.send", senderId: guest.playerId, channel: "public", text: "hola" },
    });
    expect(sent.events[0]?.type).toBe("chat.message");
  });
});
