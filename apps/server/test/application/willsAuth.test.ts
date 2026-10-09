import { describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/testApp.js";

async function started() {
  const app = createTestApp();
  const host = await app.services.createRoom({ nick: "P1" });
  const others = [];
  for (let i = 2; i <= 10; i++) others.push(await app.services.joinRoom({ roomCode: host.roomCode, nick: `P${i}` }));
  await app.services.startMatch({ matchId: host.matchId, token: host.token });
  return { app, host, guest: others[0]! };
}

describe("testamento y cancelación: autorización", () => {
  it("no se puede escribir el testamento de otro jugador", async () => {
    const { app, host, guest } = await started();
    await expect(
      app.services.submitCommand({ matchId: host.matchId, token: guest.token, command: { type: "will.write", playerId: host.playerId, text: "x" } }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("el propio testamento se escribe y aparece en la vista del dueño, no en la de los demás", async () => {
    const { app, host, guest } = await started();
    await app.services.submitCommand({ matchId: host.matchId, token: guest.token, command: { type: "will.write", playerId: guest.playerId, text: "Para Bea." } });
    const own = await app.services.getView({ matchId: host.matchId, token: guest.token });
    expect(own.me.will).toBe("Para Bea.");
    const other = await app.services.getView({ matchId: host.matchId, token: host.token });
    expect(JSON.stringify(other)).not.toContain("Para Bea.");
  });

  it("no se puede cancelar la acción de otro jugador", async () => {
    const { app, host, guest } = await started();
    await expect(
      app.services.submitCommand({ matchId: host.matchId, token: guest.token, command: { type: "night.action.cancel", actorId: host.playerId } }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("la vista lista cada rol con su grupo", async () => {
    const { app, host } = await started();
    const view = await app.services.getView({ matchId: host.matchId, token: host.token });
    expect(view.rolesInGame.every((r) => typeof r.key === "string" && r.alignment !== undefined)).toBe(true);
  });
});
