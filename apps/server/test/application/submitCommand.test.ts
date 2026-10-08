import { describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/testApp.js";

async function playingRoom() {
  const app = createTestApp();
  const host = await app.services.createRoom({ nick: "Ana" });
  const guest = await app.services.joinRoom({ roomCode: host.roomCode, nick: "Bea" });
  const match = await app.matches.findById(host.matchId);
  await app.matches.update({ ...match!, status: "playing" });
  return { app, host, guest };
}

describe("submitCommand", () => {
  it("rechaza un token que no pertenece a la partida", async () => {
    const { app, host } = await playingRoom();
    const other = await app.services.createRoom({ nick: "Otro" });
    await expect(
      app.services.submitCommand({
        matchId: host.matchId,
        token: other.token,
        command: { type: "vote", voterId: host.playerId, targetId: null },
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("rechaza comandos mientras la partida está en lobby", async () => {
    const app = createTestApp();
    const host = await app.services.createRoom({ nick: "Ana" });
    await expect(
      app.services.submitCommand({
        matchId: host.matchId,
        token: host.token,
        command: { type: "vote", voterId: host.playerId, targetId: null },
      }),
    ).rejects.toMatchObject({ code: "invalid_state" });
  });

  it("el motor rechaza un comando fuera de fase y no escribe nada", async () => {
    const { app, host } = await playingRoom();
    await expect(
      app.services.submitCommand({
        matchId: host.matchId,
        token: host.token,
        command: { type: "vote", voterId: host.playerId, targetId: null },
      }),
    ).rejects.toMatchObject({ code: "engine_rejected", message: expect.stringContaining("votación") });
    expect(await app.events.read(host.matchId)).toEqual([]);
    expect(app.broadcaster.published).toEqual([]);
  });

  it("una partida inexistente devuelve not_found", async () => {
    const app = createTestApp();
    await expect(
      app.services.submitCommand({ matchId: "nope", token: "x", command: { type: "timer.expired" } }),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});
