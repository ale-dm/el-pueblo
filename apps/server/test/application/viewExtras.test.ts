import { describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/testApp.js";

async function started() {
  const app = createTestApp();
  const host = await app.services.createRoom({ nick: "P1" });
  const people = [{ playerId: host.playerId, token: host.token, matchId: host.matchId }];
  for (let i = 2; i <= 10; i++) {
    const j = await app.services.joinRoom({ roomCode: host.roomCode, nick: `P${i}` });
    people.push({ playerId: j.playerId, token: j.token, matchId: j.matchId });
  }
  return { app, host, people };
}

describe("vista: cuenta atrás, roles y compañeros", () => {
  it("en el lobby no hay cuenta atrás", async () => {
    const { app, host } = await started();
    const view = await app.services.getView({ matchId: host.matchId, token: host.token });
    expect(view.phaseEndsAt).toBeNull();
  });

  it("al empezar, la primera fase termina a los 15 s del inicio", async () => {
    const { app, host, people } = await started();
    await app.services.startMatch({ matchId: host.matchId, token: host.token });
    const view = await app.services.getView({ matchId: host.matchId, token: people[1]!.token });
    expect(view.phaseEndsAt).toBe(new Date(app.clock.now().getTime() + 15_000).toISOString());
  });

  it("la lista de roles es pública y tiene un rol por jugador", async () => {
    const { app, host, people } = await started();
    await app.services.startMatch({ matchId: host.matchId, token: host.token });
    const view = await app.services.getView({ matchId: host.matchId, token: people[0]!.token });
    expect(view.rolesInGame).toHaveLength(10);
    expect([...view.rolesInGame].sort()).toEqual(view.rolesInGame);
  });

  it("la Mafia ve a sus compañeros; el pueblo no", async () => {
    const { app, host, people } = await started();
    await app.services.startMatch({ matchId: host.matchId, token: host.token });
    const roster = await app.players.listByMatch(host.matchId);
    const mafia = roster.filter((p) => p.faction === "mafia");
    const town = roster.find((p) => p.faction === "town")!;
    const mafiaToken = people.find((p) => p.playerId === mafia[0]!.id)!.token;
    const townToken = people.find((p) => p.playerId === town.id)!.token;

    const mafiaView = await app.services.getView({ matchId: host.matchId, token: mafiaToken });
    const allies = mafiaView.players.filter((p) => p.ally).map((p) => p.id);
    expect(allies.sort()).toEqual(mafia.filter((p) => p.id !== mafia[0]!.id).map((p) => p.id).sort());

    const townView = await app.services.getView({ matchId: host.matchId, token: townToken });
    expect(townView.players.some((p) => p.ally)).toBe(false);
  });
});

describe("vista: alineamiento propio", () => {
  it("cada jugador ve el grupo de su rol", async () => {
    const app = createTestApp();
    const host = await app.services.createRoom({ nick: "P1" });
    for (let i = 2; i <= 10; i++) await app.services.joinRoom({ roomCode: host.roomCode, nick: `P${i}` });
    await app.services.startMatch({ matchId: host.matchId, token: host.token });
    const view = await app.services.getView({ matchId: host.matchId, token: host.token });
    expect(view.me.alignment).toMatch(/^(town|mafia)_/);
  });
});
