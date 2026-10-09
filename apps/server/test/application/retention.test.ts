import { describe, expect, it } from "vitest";
import { purgeExpired } from "../../src/application/use-cases/retention.js";
import { createTestApp } from "../helpers/testApp.js";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe("retención", () => {
  it("una sala en lobby que nunca empezó se borra pasadas 24 horas", async () => {
    const app = createTestApp();
    const room = await app.services.createRoom({ nick: "P1" });
    await app.services.purgeExpired();
    expect(await app.matches.findById(room.matchId)).not.toBeNull();

    app.clock.advance(25 * HOUR);
    const result = await app.services.purgeExpired();
    expect(result.lobbies).toBe(1);
    expect(await app.matches.findById(room.matchId)).toBeNull();
  });

  it("una partida terminada se borra 30 días después de terminar, no antes", async () => {
    const app = createTestApp();
    const room = await app.services.createRoom({ nick: "P1" });
    const match = await app.matches.findById(room.matchId);
    const endedAt = app.clock.now();
    await app.matches.update({ ...match!, status: "finished", endedAt });

    app.clock.advance(29 * DAY);
    expect((await app.services.purgeExpired()).finished).toBe(0);

    app.clock.advance(2 * DAY);
    expect((await app.services.purgeExpired()).finished).toBe(1);
    expect(await app.matches.findById(room.matchId)).toBeNull();
  });

  it("al terminar, una partida pierde sus suscripciones push", async () => {
    const app = createTestApp();
    const room = await app.services.createRoom({ nick: "P1" });
    await app.push.upsert({
      matchPlayerId: "x", matchId: room.matchId, endpoint: "https://push.example/1", p256dh: "p", auth: "a",
    });
    const match = await app.matches.findById(room.matchId);
    await app.matches.update({ ...match!, status: "finished", endedAt: app.clock.now() });
    await purgeExpired({ matches: app.matches, push: app.push, clock: app.clock, policy: { lobbyTtlHours: 24, finishedRetentionDays: 30 } })();
    expect(await app.push.listByMatch(room.matchId)).toHaveLength(0);
  });
});
