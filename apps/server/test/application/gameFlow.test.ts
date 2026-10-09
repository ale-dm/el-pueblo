import { describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/testApp.js";

describe("flujo de partida completo con el motor real", () => {
  it("10 jugadores entran, el host empieza, se reparten roles y el chat público se publica", async () => {
    const app = createTestApp();
    const host = await app.services.createRoom({ nick: "P1" });
    const others = [];
    for (let i = 2; i <= 10; i++) {
      others.push(await app.services.joinRoom({ roomCode: host.roomCode, nick: `P${i}` }));
    }

    const started = await app.services.startMatch({ matchId: host.matchId, token: host.token });
    expect(started.events).toBeGreaterThan(10);

    const match = await app.matches.findById(host.matchId);
    expect(match?.status).toBe("playing");

    const roster = await app.players.listByMatch(host.matchId);
    expect(roster.every((p) => p.roleKey !== null && p.faction !== null)).toBe(true);
    expect(roster.filter((p) => p.faction === "mafia")).toHaveLength(3);

    // Chat público durante el primer día: abierto para todos los vivos.
    const guest = others[0]!;
    const sent = await app.services.submitCommand({
      matchId: host.matchId,
      token: guest.token,
      command: { type: "chat.send", senderId: guest.playerId, channel: "public", text: "hola" },
    });
    expect(sent.events[0]?.type).toBe("chat.message");
    expect(app.broadcaster.published.at(-1)?.events[0]?.type).toBe("chat.message");
  });

  it("solo el anfitrión puede empezar la partida", async () => {
    const app = createTestApp();
    const host = await app.services.createRoom({ nick: "P1" });
    const guest = await app.services.joinRoom({ roomCode: host.roomCode, nick: "P2" });
    await expect(app.services.startMatch({ matchId: host.matchId, token: guest.token })).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("no se puede empezar con menos de 10 jugadores", async () => {
    const app = createTestApp();
    const host = await app.services.createRoom({ nick: "P1" });
    await expect(app.services.startMatch({ matchId: host.matchId, token: host.token })).rejects.toMatchObject({
      code: "engine_rejected",
    });
  });

  it("al reconectar, un jugador de la Mafia ve su chat y un Town no", async () => {
    const app = createTestApp();
    const host = await app.services.createRoom({ nick: "P1" });
    const players: Array<{ playerId: string; token: string }> = [host];
    for (let i = 2; i <= 10; i++) {
      players.push(await app.services.joinRoom({ roomCode: host.roomCode, nick: `P${i}` }));
    }
    await app.services.startMatch({ matchId: host.matchId, token: host.token });
    const roster = await app.players.listByMatch(host.matchId);
    const mafia = roster.find((p) => p.faction === "mafia")!;
    const town = roster.find((p) => p.faction === "town")!;
    const mafiaToken = players.find((p) => p.playerId === mafia.id)!.token;
    const townToken = players.find((p) => p.playerId === town.id)!.token;

    // Cambia a la noche con el motor (timers) y escribe un mensaje de la Mafia.
    await app.services.advance(host.matchId);
    await app.services.advance(host.matchId);
    await app.services.advance(host.matchId);
    await app.services.submitCommand({
      matchId: host.matchId,
      token: mafiaToken,
      command: { type: "chat.send", senderId: mafia.id, channel: "mafia", text: "esta noche" },
    });

    const mafiaView = await app.services.reconnect({ matchId: host.matchId, token: mafiaToken });
    const townView = await app.services.reconnect({ matchId: host.matchId, token: townToken });
    expect(mafiaView.events.some((e) => e.type === "chat.message" && e.payload.channel === "mafia")).toBe(true);
    expect(townView.events.some((e) => e.type === "chat.message" && e.payload.channel === "mafia")).toBe(false);
    // El rol privado solo lo ve su dueño.
    expect(townView.events.filter((e) => e.type === "roles.assigned").every((e) => e.payload.playerId === town.id)).toBe(true);
  });
});
