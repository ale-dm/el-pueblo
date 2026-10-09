import { describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/testApp.js";
import { initialState } from "../../src/application/state/initialState.js";

/** El avance de fase es asíncrono: se espera a que termine antes de mirar la tabla o la vista. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

/** Partida de 10 jugadores en la que el host avanza hasta la primera noche (la fase de día 1 vence por tiempo). */
async function startedGame() {
  const app = createTestApp();
  const host = await app.services.createRoom({ nick: "P1" });
  const players: Array<{ playerId: string; token: string }> = [host];
  for (let i = 2; i <= 10; i++) {
    players.push(await app.services.joinRoom({ roomCode: host.roomCode, nick: `P${i}` }));
  }
  await app.services.startMatch({ matchId: host.matchId, token: host.token });
  return { app, host, players };
}

describe("tabla de jugadores: las muertes quedan registradas (recordDeaths)", () => {
  it("una muerte nocturna pone al jugador como muerto con su causa, y la tabla coincide con el registro", async () => {
    const { app, host, players } = await startedGame();
    app.scheduler.fire(host.matchId); // día 1 -> noche 1
    await settle();
    // Solo actúa el Godfather: nadie puede bloquear ni proteger la muerte, así que la víctima muere seguro.
    const roster = await app.players.listByMatch(host.matchId);
    const godfather = roster.find((r) => r.roleKey === "godfather")!;
    const town = roster.find((r) => r.faction === "town")!;
    await app.services.submitCommand({
      matchId: host.matchId,
      token: players.find((p) => p.playerId === godfather.id)!.token,
      command: { type: "night.action", actorId: godfather.id, ability: "kill", targetId: town.id, secondTargetId: null },
    });
    app.scheduler.fire(host.matchId); // noche 1 -> día 2, por temporizador
    await settle();

    const log = await app.events.read(host.matchId);
    const causes = log.flatMap((e) => (e.type === "player.killed" && e.payload.playerId === town.id ? [e.payload.cause] : []));
    expect(causes).toHaveLength(1);

    const after = await app.players.listByMatch(host.matchId);
    expect(after.find((p) => p.id === town.id)).toMatchObject({ status: "dead", deathReason: causes[0] });
    expect(after.filter((p) => p.status === "dead").map((p) => p.id)).toEqual([town.id]);
  });

  it("tras reiniciar, la partida arranca con todos vivos y la vista muestra al muerto", async () => {
    const { app, host, players } = await startedGame();
    app.scheduler.fire(host.matchId);
    await settle();
    const roster = await app.players.listByMatch(host.matchId);
    const godfather = roster.find((r) => r.roleKey === "godfather")!;
    const town = roster.find((r) => r.faction === "town")!;
    await app.services.submitCommand({
      matchId: host.matchId,
      token: players.find((p) => p.playerId === godfather.id)!.token,
      command: { type: "night.action", actorId: godfather.id, ability: "kill", targetId: town.id, secondTargetId: null },
    });
    app.scheduler.fire(host.matchId);
    await settle();
    const before = await app.services.getView({ matchId: host.matchId, token: host.token });

    // Reinicio: la tabla ya marca a la víctima como muerta, pero el estado inicial de la reconstrucción no debe heredarlo.
    const restarted = createTestApp(app.durableState);
    const match = (await restarted.matches.findById(host.matchId))!;
    const rosterAfterRestart = await restarted.players.listByMatch(host.matchId);
    expect(rosterAfterRestart.find((p) => p.id === town.id)?.status).toBe("dead");
    const start = initialState(match, rosterAfterRestart);
    expect(start.players.every((p) => p.status === "alive" && p.deathReason === null)).toBe(true);

    await restarted.services.recoverTimers(restarted.services.advance);
    const after = await restarted.services.getView({ matchId: host.matchId, token: host.token });
    expect(after).toEqual(before);
    expect(after.players.find((p) => p.id === town.id)?.status).toBe("dead");
  });
});
