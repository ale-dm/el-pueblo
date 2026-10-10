import { describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/testApp.js";
import { DEFAULT_NAMES } from "../../src/application/defaultNames.js";
import { namingTimerKey } from "../../src/application/use-cases/beginNaming.js";

/** Sala de diez jugadores. El anfitrión es el asiento 1. Los nombres de entrada son provisionales. */
async function room() {
  const app = createTestApp();
  const host = await app.services.createRoom({ nick: "Anfitrion" });
  const players: Array<{ playerId: string; token: string; matchId: string }> = [host];
  for (let i = 2; i <= 10; i++) players.push(await app.services.joinRoom({ roomCode: host.roomCode, nick: `Entrada${i}` }));
  return { app, host, players, matchId: host.matchId, roomCode: host.roomCode };
}

/** Espera a que las tareas asíncronas de la cola terminen (el temporizador dispara trabajo en segundo plano). */
async function settle(check: () => Promise<boolean>) {
  for (let i = 0; i < 200 && !(await check()); i++) await new Promise((r) => setTimeout(r, 0));
}

describe("elección de nombres antes de repartir", () => {
  it("el anfitrión abre la elección: los nombres de entrada se borran y hay un plazo", async () => {
    const { app, host, matchId } = await room();
    const { namingEndsAt } = await app.services.beginNaming({ matchId, token: host.token });
    expect(namingEndsAt).toBeTruthy();
    const view = await app.services.getView({ matchId, token: host.token });
    expect(view.namingEndsAt).toBe(namingEndsAt);
    expect(view.players.every((p) => p.nick === "")).toBe(true);
  });

  it("solo el anfitrión la abre, y solo una vez; con pocos jugadores no empieza", async () => {
    const { app, players, matchId } = await room();
    await expect(app.services.beginNaming({ matchId, token: players[1]!.token })).rejects.toMatchObject({ code: "forbidden" });
    await app.services.beginNaming({ matchId, token: players[0]!.token });
    await expect(app.services.beginNaming({ matchId, token: players[0]!.token })).rejects.toMatchObject({ code: "invalid_state" });
  });

  it("el nombre sigue las reglas de la wiki: letras, hasta 16, sin dos mayúsculas seguidas ni nombres por defecto", async () => {
    const { app, players, matchId } = await room();
    await app.services.beginNaming({ matchId, token: players[0]!.token });
    const me = players[1]!;
    await expect(app.services.chooseName({ matchId, token: me.token, nick: "Ana1" })).rejects.toMatchObject({ code: "invalid_input" });
    await expect(app.services.chooseName({ matchId, token: me.token, nick: "ANa" })).rejects.toMatchObject({ code: "invalid_input" });
    await expect(app.services.chooseName({ matchId, token: me.token, nick: "Maria Jose Gonzalez Lopez" })).rejects.toMatchObject({ code: "invalid_input" });
    await expect(app.services.chooseName({ matchId, token: me.token, nick: "John Proctor" })).rejects.toMatchObject({ code: "invalid_input" });
    expect(await app.services.chooseName({ matchId, token: me.token, nick: "  Bea Lopez " })).toEqual({ nick: "Bea Lopez" });
  });

  it("no se repite un nombre ya elegido, sin distinguir mayúsculas", async () => {
    const { app, players, matchId } = await room();
    await app.services.beginNaming({ matchId, token: players[0]!.token });
    await app.services.chooseName({ matchId, token: players[1]!.token, nick: "Bea Lopez" });
    await expect(app.services.chooseName({ matchId, token: players[2]!.token, nick: "bea lopez" })).rejects.toMatchObject({ code: "invalid_input" });
    // Quien ya tiene ese nombre puede repetirlo: no es un conflicto consigo mismo.
    expect(await app.services.chooseName({ matchId, token: players[1]!.token, nick: "Bea Lopez" })).toEqual({ nick: "Bea Lopez" });
  });

  it("al acabar el plazo, quien no eligió recibe un nombre por defecto distinto y los demás conservan el suyo", async () => {
    const { app, players, matchId, roomCode } = await room();
    await app.services.beginNaming({ matchId, token: players[0]!.token });
    await app.services.chooseName({ matchId, token: players[1]!.token, nick: "Bea Lopez" });
    await expect(app.services.joinRoom({ roomCode, nick: "Tarde" })).rejects.toMatchObject({ code: "invalid_state" });

    expect(app.scheduler.fire(namingTimerKey(matchId))).toBe(true);
    await settle(async () => (await app.matches.findById(matchId))?.status === "playing");

    const roster = await app.players.listByMatch(matchId);
    expect((await app.matches.findById(matchId))?.status).toBe("playing");
    expect(roster.find((p) => p.id === players[1]!.playerId)?.nick).toBe("Bea Lopez");
    const others = roster.filter((p) => p.id !== players[1]!.playerId);
    expect(others.every((p) => (DEFAULT_NAMES as readonly string[]).includes(p.nick))).toBe(true);
    expect(new Set(roster.map((p) => p.nick.toLowerCase())).size).toBe(roster.length);
  });

  it("si el anfitrión empieza antes del plazo, la partida arranca y el temporizador de nombres se cancela", async () => {
    const { app, players, matchId } = await room();
    await app.services.beginNaming({ matchId, token: players[0]!.token });
    await app.services.startMatch({ matchId, token: players[0]!.token });
    expect((await app.matches.findById(matchId))?.status).toBe("playing");
    expect(app.scheduler.pending.has(namingTimerKey(matchId))).toBe(false);
  });
});
