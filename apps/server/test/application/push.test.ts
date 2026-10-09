import { describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/testApp.js";

async function startedMatch() {
  const app = createTestApp();
  const host = await app.services.createRoom({ nick: "P1" });
  const players: Array<{ playerId: string; token: string; matchId: string }> = [host];
  for (let i = 2; i <= 10; i++) players.push(await app.services.joinRoom({ roomCode: host.roomCode, nick: `P${i}` }));
  await app.services.startMatch({ matchId: host.matchId, token: host.token });
  return { app, host, players };
}

const subscription = (n: number) => ({
  endpoint: `https://push.example.test/sub-${n}`,
  p256dh: `p256-${n}`,
  auth: `auth-${n}`,
});

describe("avisos Web Push", () => {
  it("guardar una suscripción exige token válido y endpoint HTTPS", async () => {
    const { app, host } = await startedMatch();
    await app.services.subscribePush({ matchId: host.matchId, token: host.token, ...subscription(1) });
    expect(await app.push.listByMatch(host.matchId)).toHaveLength(1);
    await expect(app.services.subscribePush({ matchId: host.matchId, token: "falso", ...subscription(2) })).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      app.services.subscribePush({ matchId: host.matchId, token: host.token, endpoint: "http://insegura", p256dh: "x", auth: "y" }),
    ).rejects.toMatchObject({ code: "invalid_input" });
  });

  it("al cambiar de fase se avisa a todos los suscritos con un texto genérico", async () => {
    const { app, players } = await startedMatch();
    for (let i = 0; i < 3; i++) {
      await app.services.subscribePush({ matchId: players[i]!.matchId, token: players[i]!.token, ...subscription(i) });
    }
    await app.services.advance(players[0]!.matchId);
    await app.services.drainNarrations();
    expect(app.pushSender.sent).toHaveLength(3);
    const text = JSON.stringify(app.pushSender.sent.map((s) => s.payload));
    expect(text).toContain("Amanece");
    // El aviso no revela nada de la partida: ni nicks ni roles.
    expect(text).not.toMatch(/P\d+/);
  });

  it("un endpoint que el navegador ya no acepta se borra", async () => {
    const { app, players } = await startedMatch();
    const matchId = players[0]!.matchId;
    await app.services.subscribePush({ matchId, token: players[0]!.token, ...subscription(9) });
    app.pushSender.gone.add(subscription(9).endpoint);
    await app.services.advance(matchId);
    await app.services.drainNarrations();
    expect(await app.push.listByMatch(matchId)).toHaveLength(0);
  });
});
