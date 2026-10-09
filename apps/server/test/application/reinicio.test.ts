import { describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/testApp.js";

/** El avance de fase es asíncrono: se espera a que termine antes de mirar la vista. */
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

describe("reinicio del servidor (M2): la partida se recupera", () => {
  it("tras reiniciar, la partida sigue en la misma fase y su temporizador vuelve a correr", async () => {
    const { app, host } = await startedGame();
    expect(app.scheduler.fire(host.matchId)).toBe(true); // día 1 -> noche 1
    await settle();
    const before = await app.services.getView({ matchId: host.matchId, token: host.token });
    expect(before.phase).toBe("night");

    // Reinicio: procesos nuevos sobre los mismos datos. El planificador de temporizadores arranca vacío.
    const restarted = createTestApp(app.durableState);
    expect(restarted.scheduler.pending.has(host.matchId)).toBe(false);
    const recovered = await restarted.services.recoverTimers(restarted.services.advance);
    expect(recovered).toBe(1);
    expect(restarted.scheduler.pending.has(host.matchId)).toBe(true);

    // La vista del mismo jugador es idéntica a la de antes del reinicio.
    const after = await restarted.services.getView({ matchId: host.matchId, token: host.token });
    expect(after).toEqual(before);

    // El temporizador recuperado hace avanzar la partida.
    expect(restarted.scheduler.fire(host.matchId)).toBe(true);
    await settle();
    const next = await restarted.services.getView({ matchId: host.matchId, token: host.token });
    expect(next.phase).toBe("discussion");
    expect(next.dayNumber).toBe(2);
  });

  it("las acciones de la noche hechas antes del reinicio siguen registradas", async () => {
    const { app, host, players } = await startedGame();
    app.scheduler.fire(host.matchId); // noche 1
    await settle();
    // El Godfather está siempre en la partida (roleList.ts): su orden de matar no depende del azar.
    const roster = await app.players.listByMatch(host.matchId);
    const godfather = roster.find((r) => r.roleKey === "godfather")!;
    const town = roster.find((r) => r.faction === "town")!;
    const godfatherToken = players.find((p) => p.playerId === godfather.id)!.token;
    await app.services.submitCommand({
      matchId: host.matchId,
      token: godfatherToken,
      command: { type: "night.action", actorId: godfather.id, ability: "kill", targetId: town.id, secondTargetId: null },
    });

    const restarted = createTestApp(app.durableState);
    await restarted.services.recoverTimers(restarted.services.advance);
    const view = await restarted.services.getView({ matchId: host.matchId, token: godfatherToken });
    expect(view.me.nightAction).toMatchObject({ ability: "kill", targetId: town.id });
  });
});
