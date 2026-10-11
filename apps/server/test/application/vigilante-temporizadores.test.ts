import { describe, expect, it, vi } from "vitest";
import { createTestApp } from "../helpers/testApp.js";
import { ConcurrencyError } from "../../src/application/errors.js";
import { namingTimerKey } from "../../src/application/use-cases/beginNaming.js";

/** Partida en juego con el día 1 armado. */
async function playingMatch() {
  const app = createTestApp();
  const host = await app.services.createRoom({ nick: "Ana" });
  for (let i = 2; i <= 10; i++) await app.services.joinRoom({ roomCode: host.roomCode, nick: `Entrada${i}` });
  await app.services.beginNaming({ matchId: host.matchId, token: host.token });
  await app.services.startMatch({ matchId: host.matchId, token: host.token });
  return { app, host, matchId: host.matchId };
}

/** Espera a que una condición se cumpla (las tareas de la cola son asíncronas). */
async function until(check: () => boolean | Promise<boolean>) {
  for (let i = 0; i < 300 && !(await check()); i++) await new Promise((r) => setTimeout(r, 10));
}

describe("temporizadores: reintentos, fase obsoleta y vigilante", () => {
  it("un fallo transitorio se reintenta con espera creciente y, si el siguiente intento va bien, la partida avanza", async () => {
    const { app, matchId } = await playingMatch();
    const original = app.events.append.bind(app.events);
    let failures = 1;
    app.events.append = async (...args) => {
      if (failures-- > 0) throw new ConcurrencyError();
      return original(...args);
    };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const before = (await app.events.read(matchId)).length;
    try {
      app.scheduler.fire(matchId);
      await until(() => app.scheduler.has(matchId));
      expect(app.scheduler.pending.get(matchId)?.delayMs).toBe(1000);
      const reintento = errorSpy.mock.calls.some((c) => String(c[0]).includes("reintento 1"));
      expect(reintento).toBe(true);
      app.scheduler.fire(matchId);
      await until(async () => (await app.events.read(matchId)).length > before);
    } finally {
      app.events.append = original;
      errorSpy.mockRestore();
    }
    expect((await app.events.read(matchId)).length).toBeGreaterThan(before);
  });

  it("un fallo del motor (no transitorio) no se reintenta: se registra y queda para el vigilante", async () => {
    const { app, matchId } = await playingMatch();
    const original = app.events.append.bind(app.events);
    app.events.append = async () => {
      throw new Error('new row for relation "events" violates check constraint "events_private_needs_audience"');
    };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      app.scheduler.fire(matchId);
      await until(() => errorSpy.mock.calls.length > 0);
      await new Promise((r) => setTimeout(r, 30));
    } finally {
      app.events.append = original;
    }
    const messages = errorSpy.mock.calls.map((c) => String(c[0]));
    errorSpy.mockRestore();
    expect(messages.some((m) => m.includes(`de la partida ${matchId} falló`) && m.includes("vigilante"))).toBe(true);
    expect(app.scheduler.has(matchId)).toBe(false);
  });

  it("un temporizador viejo no avanza una fase que ya cambió", async () => {
    const { app, matchId } = await playingMatch();
    const before = (await app.events.read(matchId)).length;
    await app.services.advance(matchId, { phase: "voting", dayNumber: 9 });
    expect((await app.events.read(matchId)).length).toBe(before);
  });

  it("el vigilante rearma la fase de una partida sin temporizador, y no pisa uno que ya existe", async () => {
    const { app, matchId } = await playingMatch();
    app.scheduler.cancel(matchId);
    expect(app.scheduler.has(matchId)).toBe(false);
    await app.services.recoverTimers(app.services.advance, { bots: false });
    expect(app.scheduler.has(matchId)).toBe(true);
    const existing = app.scheduler.pending.get(matchId);
    await app.services.recoverTimers(app.services.advance, { bots: false });
    expect(app.scheduler.pending.get(matchId)).toBe(existing);
  });

  it("el vigilante rearma la elección de nombres si se perdió su temporizador", async () => {
    const app = createTestApp();
    const host = await app.services.createRoom({ nick: "Ana" });
    for (let i = 2; i <= 10; i++) await app.services.joinRoom({ roomCode: host.roomCode, nick: `Entrada${i}` });
    await app.services.beginNaming({ matchId: host.matchId, token: host.token });
    app.scheduler.cancel(namingTimerKey(host.matchId));
    await app.services.recoverTimers(app.services.advance, { bots: false });
    expect(app.scheduler.has(namingTimerKey(host.matchId))).toBe(true);
  });
});
