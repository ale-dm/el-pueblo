import { describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/testApp.js";

/**
 * Dispara temporizadores de fase y de bots hasta que la partida termina (o se agotan los pasos).
 * Los bots actúan antes que el temporizador de la fase, como en producción (1,5–7 s frente a decenas de segundos).
 * Entre disparos se espera a que la cola de la partida termine: si no, el avance de fase adelanta a los bots.
 */
async function playToEnd(app: ReturnType<typeof createTestApp>, matchId: string, maxSteps = 1000) {
  const botKey = app.services.botKey(matchId);
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  for (let step = 0; step < maxSteps; step++) {
    const match = await app.matches.findById(matchId);
    if (match?.status === "finished") return step;
    app.scheduler.fire(botKey);
    await settle();
    app.scheduler.fire(matchId);
    await settle();
  }
  throw new Error("la partida no terminó dentro del límite de pasos");
}

describe("bots en la sala", () => {
  it("crear sala con bots: ocupan asientos, se marcan como bots y cuentan para el límite", async () => {
    const app = createTestApp();
    const host = await app.services.createRoom({ nick: "Ana", bots: 3 });

    const roster = await app.players.listByMatch(host.matchId);
    expect(roster.map((p) => [p.seat, p.nick, p.isBot ?? false])).toEqual([
      [1, "Ana", false],
      [2, "Bot 1", true],
      [3, "Bot 2", true],
      [4, "Bot 3", true],
    ]);

    const view = await app.services.getView({ matchId: host.matchId, token: host.token });
    expect(view.players.filter((p) => p.isBot).map((p) => p.nick)).toEqual(["Bot 1", "Bot 2", "Bot 3"]);

    const guest = await app.services.joinRoom({ roomCode: host.roomCode, nick: "Luis" });
    expect(guest.seat).toBe(5);
  });

  it("la sala se llena con los bots: no entra nadie más de 15 plazas", async () => {
    const app = createTestApp();
    const host = await app.services.createRoom({ nick: "Ana", bots: 13 });
    await app.services.joinRoom({ roomCode: host.roomCode, nick: "Luis" });
    await expect(app.services.joinRoom({ roomCode: host.roomCode, nick: "Eva" })).rejects.toMatchObject({
      code: "invalid_state",
    });
  });

  it.each([15, -1, 1.5, Number.NaN])("rechaza un número de bots no válido (%s)", async (bots) => {
    const app = createTestApp();
    await expect(app.services.createRoom({ nick: "Ana", bots })).rejects.toMatchObject({ code: "invalid_input" });
  });

  it("sin bots la sala queda como antes", async () => {
    const app = createTestApp();
    const host = await app.services.createRoom({ nick: "Ana" });
    const roster = await app.players.listByMatch(host.matchId);
    expect(roster).toHaveLength(1);
    expect(roster[0]?.isBot ?? false).toBe(false);
  });
});

describe("bots en la partida", () => {
  it("una partida con 9 bots y un anfitrión inactivo se juega hasta el final", async () => {
    const app = createTestApp();
    const host = await app.services.createRoom({ nick: "Ana", bots: 9 });
    await app.services.startMatch({ matchId: host.matchId, token: host.token });

    await playToEnd(app, host.matchId);

    const events = await app.events.read(host.matchId);
    expect(events.at(-1)?.type).toBe("game.ended");
    const match = await app.matches.findById(host.matchId);
    expect(match?.status).toBe("finished");

    const roster = await app.players.listByMatch(host.matchId);
    const botIds = new Set(roster.filter((p) => p.isBot).map((p) => p.id));
    const botActions = events.filter((e) => e.type === "vote.cast" && botIds.has(e.payload.voterId));
    expect(botActions.length).toBeGreaterThan(0);
    expect(events.some((e) => e.type === "night.action.submitted" && botIds.has(e.payload.actorId))).toBe(true);
  }, 20_000);

  it("15 jugadores (14 bots y un humano) también llegan al final", async () => {
    const app = createTestApp();
    const host = await app.services.createRoom({ nick: "Ana", bots: 14 });
    await app.services.startMatch({ matchId: host.matchId, token: host.token });

    await playToEnd(app, host.matchId);

    const events = await app.events.read(host.matchId);
    expect(events.at(-1)?.type).toBe("game.ended");
  }, 20_000);

  it("el turno de bots no hace nada si la partida no ha empezado", async () => {
    const app = createTestApp();
    const host = await app.services.createRoom({ nick: "Ana", bots: 9 });
    expect(await app.services.runBots(host.matchId)).toBe(0);
  });

  it("los bots no pueden actuar con el token de un humano", async () => {
    const app = createTestApp();
    const host = await app.services.createRoom({ nick: "Ana", bots: 9 });
    await app.services.startMatch({ matchId: host.matchId, token: host.token });
    const roster = await app.players.listByMatch(host.matchId);
    const bot = roster.find((p) => p.isBot)!;
    await expect(
      app.services.submitCommand({
        matchId: host.matchId,
        token: host.token,
        command: { type: "vote", voterId: bot.id, targetId: null },
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});
