import { describe, expect, it } from "vitest";
import { game, ofType, rejected, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

// Nota de muerte del asesino (wiki: Death_Note_ToS.md:5, 15, 17; Godfather.md:235; Mafioso.md:237).
const kill = (actorId: string, targetId: string | null, note: string | null = null) =>
  ({ type: "night.action", actorId, ability: "kill", targetId, secondTargetId: null, choice: null, note }) as const;

/** Muertes de la noche (al amanecer) sobre la víctima indicada. */
const deaths = (s: GameState, victimId: string) =>
  ofType(step(s, timer()).events, "player.killed").filter((e) => e.payload.playerId === victimId);

describe("Nota de muerte del Godfather y del Mafioso (wiki: Death_Note_ToS.md:5, 15, 17)", () => {
  it("la nota del asesino aparece al amanecer junto a la víctima (Death_Note_ToS.md:5, 17)", () => {
    const s = game(["godfather", "investigator"], { dayNumber: 2 });
    const [e] = deaths(step(s, kill("p1", "p2", "Nota de prueba")).state, "p2");
    expect(e?.payload.note).toBe("Nota de prueba");
  });

  it("la nota no se muestra antes del amanecer: al enviar la acción no hay muerte (Death_Note_ToS.md:17)", () => {
    const s = game(["godfather", "investigator"], { dayNumber: 2 });
    expect(ofType(step(s, kill("p1", "p2", "Nota")).events, "player.killed")).toEqual([]);
  });

  it("sin nota, la muerte no trae nota (Death_Note_ToS.md:5)", () => {
    const s = game(["godfather", "investigator"], { dayNumber: 2 });
    const [e] = deaths(step(s, kill("p1", "p2")).state, "p2");
    expect(e?.payload.cause).toBe("mafia");
    expect(e?.payload.note).toBeUndefined();
  });

  it("una nota de solo espacios no cuenta como nota", () => {
    const s = game(["godfather", "investigator"], { dayNumber: 2 });
    const [e] = deaths(step(s, kill("p1", "p2", "   ")).state, "p2");
    expect(e?.payload.note).toBeUndefined();
  });

  it("hasta 400 caracteres se aceptan y más de 400 se rechaza (Death_Note_ToS.md:15)", () => {
    const s = game(["godfather", "investigator"], { dayNumber: 2 });
    expect(rejected(s, kill("p1", "p2", "a".repeat(400)))).toBeNull();
    expect(rejected(s, kill("p1", "p2", "a".repeat(401)))).toMatch(/400 caracteres/);
  });

  it("solo quien mata lleva nota: otra habilidad con nota se rechaza (Godfather.md:235, Mafioso.md:237)", () => {
    const s = game(["sheriff", "investigator"], { dayNumber: 2 });
    const check = { type: "night.action", actorId: "p1", ability: "interrogate", targetId: "p2", secondTargetId: null, choice: null, note: "Hola" } as const;
    expect(rejected(s, check)).toMatch(/no lleva nota de muerte/);
  });

  it("solo quien hace la muerte deja su nota: el Mafioso con orden del Godfather (Godfather.md:36, Mafioso.md:23)", () => {
    const s = game(["godfather", "mafioso", "investigator"], { dayNumber: 2 });
    const withOrders = step(step(s, kill("p1", "p3", "del Godfather")).state, kill("p2", "p3", "del Mafioso")).state;
    const [e] = deaths(withOrders, "p3");
    expect(e?.payload.note).toBe("del Mafioso");
  });

  it("si el Mafioso no puede matar, el Godfather mata y su nota es la que sale (Godfather.md:26, 36)", () => {
    const s = game(["godfather", "mafioso", "investigator"], { dayNumber: 2 });
    const mafiosoDead: GameState = { ...s, players: s.players.map((p) => (p.id === "p2" ? { ...p, status: "dead" as const } : p)) };
    const withOrder = step(mafiosoDead, kill("p1", "p3", "del Godfather")).state;
    const [e] = deaths(withOrder, "p3");
    expect(e?.payload.note).toBe("del Godfather");
  });

  it("si el Mafioso está bloqueado, el Godfather mata y su nota sale, no la del Mafioso (Mafioso.md:279)", () => {
    const s = game(["godfather", "mafioso", "tavern_keeper", "investigator"], { dayNumber: 2 });
    const blocked = step(step(step(s, kill("p1", "p4", "del Godfather")).state, kill("p2", "p4", "del Mafioso")).state,
      { type: "night.action", actorId: "p3", ability: "distract", targetId: "p2", secondTargetId: null, choice: null });
    const [e] = deaths(blocked.state, "p4");
    expect(e?.payload.note).toBe("del Godfather");
  });

  it("si la víctima sobrevive (encarcelada), no hay nota de muerte (Death_Note_ToS.md:5: \"after a non-Town role kills someone\")", () => {
    const base = game(["godfather", "jailor", "investigator"], { dayNumber: 2, jailedBy: { p3: "p2" } });
    const jailed: GameState = { ...base, players: base.players.map((p) => (p.id === "p3" ? { ...p, flags: { ...p.flags, jailed: true } } : p)) };
    const s = step(jailed, kill("p1", "p3", "Nota")).state;
    expect(deaths(s, "p3")).toEqual([]);
  });

  it("la última acción de la noche es la que vale: cambiar la nota la reemplaza y cancelar la quita (Death_Note_ToS.md:17)", () => {
    const s = game(["godfather", "investigator"], { dayNumber: 2 });
    const changed = step(step(s, kill("p1", "p2", "primera")).state, kill("p1", "p2", "segunda")).state;
    expect(changed.nightActions.p1?.note).toBe("segunda");
    const cancelled = step(changed, { type: "night.action.cancel", actorId: "p1" }).state;
    expect(cancelled.nightActions.p1).toBeUndefined();
  });
});
