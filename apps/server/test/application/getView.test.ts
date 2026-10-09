import { describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/testApp.js";

async function startedGame() {
  const app = createTestApp();
  const host = await app.services.createRoom({ nick: "P1" });
  const players: Array<{ playerId: string; token: string; matchId: string }> = [host];
  for (let i = 2; i <= 10; i++) players.push(await app.services.joinRoom({ roomCode: host.roomCode, nick: `P${i}` }));
  await app.services.startMatch({ matchId: host.matchId, token: host.token });
  return { app, host, players };
}

describe("vista por jugador", () => {
  it("cada jugador ve su propio rol y no el de los demás", async () => {
    const { app, players } = await startedGame();
    const view = await app.services.getView({ matchId: players[0]!.matchId, token: players[0]!.token });
    expect(view.me.roleKey).not.toBeNull();
    expect(view.me.roleName).not.toBeNull();
    expect(view.players.every((p) => p.revealedRoleKey === null)).toBe(true);
    // El objeto de la vista no contiene roles de otros jugadores.
    const json = JSON.stringify(view);
    const others = (await app.players.listByMatch(players[0]!.matchId)).filter((p) => p.id !== view.me.id);
    expect(others.every((p) => p.roleKey && !json.includes(`"roleKey":"${p.roleKey}"`) || p.roleKey === view.me.roleKey)).toBe(true);
  });

  it("las acciones nocturnas de otros no aparecen en la vista", async () => {
    const { app, players } = await startedGame();
    const matchId = players[0]!.matchId;
    const roster = await app.players.listByMatch(matchId);
    const mafia = roster.find((p) => p.faction === "mafia")!;
    const mafiaToken = players.find((p) => p.playerId === mafia.id)!.token;
    await app.services.advance(matchId);
    await app.services.advance(matchId);
    await app.services.advance(matchId);
    const other = roster.find((p) => p.id !== mafia.id)!;
    const otherToken = players.find((p) => p.playerId === other.id)!.token;
    const view = await app.services.getView({ matchId, token: otherToken });
    expect(view.me.nightAction).toBeNull();
    expect(view.phase).toBe("night");
    const mafiaView = await app.services.getView({ matchId, token: mafiaToken });
    expect(mafiaView.me.faction).toBe("mafia");
  });

  it("un token de otra partida o falso se rechaza", async () => {
    const { app, players } = await startedGame();
    await expect(app.services.getView({ matchId: players[0]!.matchId, token: "falso" })).rejects.toMatchObject({ code: "forbidden" });
  });

  it("los roles de los muertos se revelan solo cuando el registro los muestra", async () => {
    const { app, players } = await startedGame();
    const matchId = players[0]!.matchId;
    // Forzamos una muerte en el registro con el rol visible.
    const roster = await app.players.listByMatch(matchId);
    const target = roster.find((p) => p.faction === "town")!;
    const events = await app.events.read(matchId);
    await app.events.append(matchId, events.at(-1)!.seq, [
      { seq: events.at(-1)!.seq + 1, type: "player.killed", payload: { playerId: target.id, cause: "mafia", roleKey: target.roleKey }, visibility: "public", audiencePlayerId: null },
    ]);
    const view = await app.services.getView({ matchId, token: players[0]!.token });
    expect(view.players.find((p) => p.id === target.id)?.revealedRoleKey).toBe(target.roleKey);
    expect(view.players.find((p) => p.id === target.id)?.status).toBe("dead");
  });
});
