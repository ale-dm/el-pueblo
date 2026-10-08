import { describe, expect, it } from "vitest";
import { AppError } from "../../src/application/errors.js";
import { LIMITS } from "../../src/application/limits.js";
import { createTestApp } from "../helpers/testApp.js";

describe("crear y unirse a una sala", () => {
  it("createRoom deja al host en el asiento 1 con partida en lobby", async () => {
    const app = createTestApp();
    const room = await app.services.createRoom({ nick: "Ana" });

    expect(room.seat).toBe(1);
    expect(room.roomCode).toMatch(/^ROOM\d{2}$/);
    const match = await app.matches.findById(room.matchId);
    expect(match?.status).toBe("lobby");
    const [host] = await app.players.listByMatch(room.matchId);
    expect(host?.nick).toBe("Ana");
    // Solo se guarda el hash del token, nunca el token.
    expect(host?.tokenHash).not.toBe(room.token);
    expect(host?.tokenHash).toBe(app.security.hashToken(room.token));
  });

  it("createRoom rechaza nicks vacíos o demasiado largos", async () => {
    const app = createTestApp();
    await expect(app.services.createRoom({ nick: "   " })).rejects.toMatchObject({ code: "invalid_input" });
    await expect(app.services.createRoom({ nick: "x".repeat(LIMITS.nickMaxLength + 1) })).rejects.toMatchObject({
      code: "invalid_input",
    });
  });

  it("joinRoom asigna el primer asiento libre", async () => {
    const app = createTestApp();
    const room = await app.services.createRoom({ nick: "Ana" });
    const bea = await app.services.joinRoom({ roomCode: room.roomCode, nick: "Bea" });
    const cy = await app.services.joinRoom({ roomCode: room.roomCode, nick: "Cy" });
    expect([bea.seat, cy.seat]).toEqual([2, 3]);
  });

  it("joinRoom rechaza nicks repetidos sin distinguir mayúsculas", async () => {
    const app = createTestApp();
    const room = await app.services.createRoom({ nick: "Ana" });
    await expect(app.services.joinRoom({ roomCode: room.roomCode, nick: "ANA" })).rejects.toMatchObject({
      code: "invalid_input",
    });
  });

  it("joinRoom con un código inexistente devuelve not_found", async () => {
    const app = createTestApp();
    await expect(app.services.joinRoom({ roomCode: "NOPE00", nick: "Bea" })).rejects.toBeInstanceOf(AppError);
    await expect(app.services.joinRoom({ roomCode: "NOPE00", nick: "Bea" })).rejects.toMatchObject({ code: "not_found" });
  });

  it("joinRoom no admite jugadores una vez empezada la partida", async () => {
    const app = createTestApp();
    const room = await app.services.createRoom({ nick: "Ana" });
    const match = await app.matches.findById(room.matchId);
    await app.matches.update({ ...match!, status: "playing" });
    await expect(app.services.joinRoom({ roomCode: room.roomCode, nick: "Bea" })).rejects.toMatchObject({
      code: "invalid_state",
    });
  });

  it(`joinRoom rechaza la entrada cuando hay ${LIMITS.maxPlayers} jugadores`, async () => {
    const app = createTestApp();
    const room = await app.services.createRoom({ nick: "P1" });
    for (let i = 2; i <= LIMITS.maxPlayers; i++) {
      await app.services.joinRoom({ roomCode: room.roomCode, nick: `P${i}` });
    }
    await expect(app.services.joinRoom({ roomCode: room.roomCode, nick: "extra" })).rejects.toMatchObject({
      code: "invalid_state",
    });
  });
});
