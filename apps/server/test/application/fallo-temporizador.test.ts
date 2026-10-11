import { describe, expect, it, vi } from "vitest";
import { createTestApp } from "../helpers/testApp.js";

/**
 * Regresión: si guardar falla al vencer el temporizador de una fase (p. ej. una restricción de BD), el error se
 * registra con la partida. No puede quedar sin manejar: en Node eso tumba el proceso, con todas las salas.
 */
describe("temporizador que falla al guardar", () => {
  it("el error se registra con la partida y no sale como rechazo sin manejar", async () => {
    const app = createTestApp();
    const host = await app.services.createRoom({ nick: "Ana" });
    for (let i = 2; i <= 10; i++) await app.services.joinRoom({ roomCode: host.roomCode, nick: `Entrada${i}` });
    await app.services.beginNaming({ matchId: host.matchId, token: host.token });
    await app.services.startMatch({ matchId: host.matchId, token: host.token });

    const original = app.events.append.bind(app.events);
    app.events.append = async () => {
      throw new Error('new row for relation "events" violates check constraint "events_private_needs_audience"');
    };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    try {
      expect(app.scheduler.fire(host.matchId)).toBe(true);
      // El temporizador espera a la cola y al catálogo: se espera al registro, no a un tiempo fijo.
      for (let i = 0; i < 200 && errorSpy.mock.calls.length === 0; i++) await new Promise((r) => setTimeout(r, 10));
    } finally {
      app.events.append = original;
      process.off("unhandledRejection", unhandled);
    }
    // Los registros se leen antes de restaurar el espía: restaurarlo borra sus llamadas.
    const messages = errorSpy.mock.calls.map((args) => String(args[0]));
    errorSpy.mockRestore();

    expect(unhandled).not.toHaveBeenCalled();
    expect(messages.some((m) => m.includes(`temporizador fase de la partida ${host.matchId} falló`))).toBe(true);
  });
});
