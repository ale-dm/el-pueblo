import { describe, expect, it } from "vitest";
import { game, ofType, rejected, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

// Forger (wiki: docs/roles/Forger.md). Cada test cita la línea que fija la regla.
const forge = (actorId: string, targetId: string, choice: string | null, forgedWill: string | null = null) =>
  ({ type: "night.action", actorId, ability: "forge", targetId, secondTargetId: null, choice, forgedWill }) as const;
const kill = (actorId: string, targetId: string) =>
  ({ type: "night.action", actorId, ability: "kill", targetId, secondTargetId: null, choice: null }) as const;

/** Muertes de la noche de una víctima. */
const killed = (s: GameState, victimId: string) =>
  ofType(step(s, timer()).events, "player.killed").filter((e) => e.payload.playerId === victimId);

describe("Forger: testamento falsificado (wiki: Forger.md:34, 156, 204, 218)", () => {
  it("si la víctima muere esa noche, se ve el testamento falsificado y el rol elegido (Forger.md:156, 204)", () => {
    let s = game(["forger", "investigator", "godfather", "sheriff"], { wills: { p2: "Testamento real" } });
    s = step(s, forge("p1", "p2", "jailor", "Testamento falso")).state;
    s = step(s, kill("p3", "p2")).state;
    const [e] = killed(s, "p2");
    expect(e?.payload.will).toBe("Testamento falso");
    expect(e?.payload.roleKey).toBe("jailor");
  });

  it("sin falsificación, la víctima deja su testamento real", () => {
    let s = game(["forger", "investigator", "godfather", "sheriff"], { wills: { p2: "Testamento real" } });
    s = step(s, kill("p3", "p2")).state;
    expect(killed(s, "p2")[0]?.payload.will).toBe("Testamento real");
  });

  it("un testamento falsificado en blanco quita el testamento (Forger.md:218)", () => {
    let s = game(["forger", "investigator", "godfather", "sheriff"], { wills: { p2: "Testamento real" } });
    s = step(s, forge("p1", "p2", "jailor", "   ")).state;
    s = step(s, kill("p3", "p2")).state;
    expect(killed(s, "p2")[0]?.payload.will).toBeNull();
  });

  it("sin texto escrito, el testamento también se quita (Forger.md:218)", () => {
    let s = game(["forger", "investigator", "godfather", "sheriff"], { wills: { p2: "Testamento real" } });
    s = step(s, forge("p1", "p2", "jailor", null)).state;
    s = step(s, kill("p3", "p2")).state;
    expect(killed(s, "p2")[0]?.payload.will).toBeNull();
  });

  it("el testamento falsificado solo cuenta si la víctima muere esa misma noche (Forger.md:212)", () => {
    let s = game(["forger", "investigator", "godfather", "sheriff"], { wills: { p2: "Testamento real" } });
    s = step(s, forge("p1", "p2", "jailor", "Falso")).state;
    s = step(s, timer()).state; // nadie ataca a p2
    s = { ...s, phase: "night", dayNumber: 3 };
    s = step(s, kill("p3", "p2")).state;
    expect(killed(s, "p2")[0]?.payload.will).toBe("Testamento real");
  });

  it("un Forger no puede falsificar el testamento de un miembro de la Mafia (Forger.md:204)", () => {
    const s = game(["forger", "godfather", "investigator"]);
    expect(rejected(s, forge("p1", "p2", "jailor", "Falso"))).toMatch(/no es de la Mafia/);
  });

  it("el testamento falsificado tiene como máximo 400 caracteres (wiki: Last_Will_ToS.md:7)", () => {
    const s = game(["forger", "investigator", "godfather", "sheriff"]);
    expect(rejected(s, forge("p1", "p2", "jailor", "a".repeat(400)))).toBeNull();
    expect(rejected(s, forge("p1", "p2", "jailor", "a".repeat(401)))).toMatch(/400 caracteres/);
  });
});

describe("Forger: rol por defecto y uso de falsificaciones (wiki: Forger.md:206, 208, 210, 242)", () => {
  it("guardar sin elegir rol deja Ambusher como rol que se ve (Forger.md:242)", () => {
    let s = game(["forger", "investigator", "godfather", "sheriff"]);
    s = step(s, forge("p1", "p2", null, "Falso")).state;
    s = step(s, kill("p3", "p2")).state;
    expect(killed(s, "p2")[0]?.payload.roleKey).toBe("ambusher");
  });

  it("si el falsificado no muere esa noche, la falsificación gasta un uso (Forger.md:210)", () => {
    const s = step(game(["forger", "investigator", "godfather", "sheriff"]), forge("p1", "p2", "jailor", "Falso")).state;
    const after = step(s, timer()).state;
    expect(after.players.find((p) => p.id === "p1")!.usesLeft.forge).toBe(1);
  });

  it("visitar a un encarcelado no gasta falsificación (Forger.md:208)", () => {
    const base = game(["forger", "jailor", "godfather", "investigator"], { dayNumber: 2, jailedBy: { p4: "p2" } });
    const s: GameState = { ...base, players: base.players.map((p) => (p.id === "p4" ? { ...p, flags: { ...p.flags, jailed: true } } : p)) };
    const after = step(step(s, forge("p1", "p4", "jailor", "Falso")).state, timer()).state;
    expect(after.players.find((p) => p.id === "p1")!.usesLeft.forge).toBe(2);
  });
});

describe("Forger: varios Forger y el Janitor (wiki: Forger.md:220, 222, 226)", () => {
  it("si dos Forger eligen a la misma víctima, manda el que eligió primero (Forger.md:226)", () => {
    let s = game(["forger", "forger", "godfather", "investigator"], { wills: { p4: "Real" } });
    s = step(s, forge("p1", "p4", "jailor", "Primero")).state;
    s = step(s, forge("p2", "p4", "sheriff", "Segundo")).state;
    s = step(s, kill("p3", "p4")).state;
    expect(killed(s, "p4")[0]?.payload).toMatchObject({ roleKey: "jailor", will: "Primero" });
  });

  it("el que eligió primero es el primero en enviar su acción, aunque tenga asiento posterior (Forger.md:226)", () => {
    let s = game(["forger", "forger", "godfather", "investigator"], { wills: { p4: "Real" } });
    s = step(s, forge("p2", "p4", "sheriff", "Segundo")).state;
    s = step(s, forge("p1", "p4", "jailor", "Primero")).state;
    s = step(s, kill("p3", "p4")).state;
    expect(killed(s, "p4")[0]?.payload).toMatchObject({ roleKey: "sheriff", will: "Segundo" });
  });

  it("un Janitor que limpia a la víctima: no aparece la falsificación, y él ve el rol y el testamento reales (Forger.md:220, 222)", () => {
    let s = game(["forger", "janitor", "godfather", "investigator"], { wills: { p4: "Real" } });
    s = step(s, forge("p1", "p4", "jailor", "Falso")).state;
    s = step(s, { type: "night.action", actorId: "p2", ability: "clean", targetId: "p4", secondTargetId: null, choice: null }).state;
    s = step(s, kill("p3", "p4")).state;
    const events = step(s, timer()).events;
    expect(ofType(events, "player.killed")[0]?.payload).toMatchObject({ playerId: "p4", roleKey: null, will: null, cleaned: true });
    expect(ofType(events, "clean.revealed")[0]?.payload).toMatchObject({ janitorId: "p2", playerId: "p4", roleKey: "investigator", will: "Real" });
  });
});
