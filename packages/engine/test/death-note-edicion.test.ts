import { describe, expect, it } from "vitest";
import { game, ofType, rejected, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

// Cambio de la nota de muerte durante el anuncio de la mañana (wiki: docs/wiki/Death_Note_ToS.md:17).
// p1 Godfather, p2 víctima, p3 Investigator, p4 Sheriff, p5 Doctor.
const kill = (actorId: string, targetId: string, note: string | null) =>
  ({ type: "night.action", actorId, ability: "kill", targetId, secondTargetId: null, choice: null, note }) as const;
const write = (actorId: string, victimId: string, note: string) =>
  ({ type: "death.note.write", actorId, victimId, note }) as const;

/** Noche 2: el Godfather mata a p2 con `note`. Devuelve la partida al amanecer del día 3 (charla). */
function morningOfDayThree(note: string | null = "Nota original"): GameState {
  let s = game(["godfather", "investigator", "sheriff", "doctor"], { dayNumber: 2 });
  s = step(s, kill("p1", "p2", note)).state;
  return step(s, timer()).state;
}

describe("Nota de muerte: cambio durante el anuncio de la mañana (wiki: Death_Note_ToS.md:17)", () => {
  it("el asesino cambia la nota en la charla de la mañana en que se anuncia la víctima, y queda registrada", () => {
    const s = morningOfDayThree();
    expect([s.phase, s.dayNumber]).toEqual(["discussion", 3]);
    const { state, events } = step(s, write("p1", "p2", "  Nota nueva  "));
    expect(ofType(events, "death.note.written").map((e) => e.payload)).toEqual([{ victimId: "p2", note: "Nota nueva" }]);
    expect(state.players[1]!.deathNote).toEqual({ authorId: "p1", dayNumber: 3, note: "Nota nueva" });
  });

  it("la nota vacía quita la nota (la wiki no fija un mínimo)", () => {
    const { state } = step(morningOfDayThree(), write("p1", "p2", "   "));
    expect(state.players[1]!.deathNote?.note).toBe("");
  });

  it("se puede cambiar una nota que no se escribió de noche (la Death Note existe aunque esté en blanco, Death_Note_ToS.md:5)", () => {
    const { state } = step(morningOfDayThree(null), write("p1", "p2", "Nota tardía"));
    expect(state.players[1]!.deathNote?.note).toBe("Nota tardía");
  });

  it("la fase day_1 también cuenta como charla de esa mañana (phases: day_1 y discussion)", () => {
    const s = { ...morningOfDayThree(), phase: "day_1" as const, dayNumber: 3 };
    expect(rejected(s, write("p1", "p2", "x"))).toBeNull();
  });

  it("fuera de la ventana: de noche, en la votación de ese día o en la noche siguiente, no se cambia (Death_Note_ToS.md:17)", () => {
    const s = morningOfDayThree();
    const voting = step(s, timer()).state;
    expect(voting.phase).toBe("voting");
    expect(rejected(voting, write("p1", "p2", "tarde"))).toMatch(/anuncio de la mañana/);
    const nightThree = { ...voting, phase: "night" as const };
    expect(rejected(nightThree, write("p1", "p2", "tarde"))).toMatch(/anuncio de la mañana/);
    const dayFour = { ...s, phase: "discussion" as const, dayNumber: 4 };
    expect(rejected(dayFour, write("p1", "p2", "tarde"))).toMatch(/la mañana en que se anuncia/);
  });

  it("solo el asesino que hizo la muerte puede cambiar la nota (Godfather.md:235; Mafioso.md:279)", () => {
    const s = morningOfDayThree();
    expect(rejected(s, write("p3", "p2", "no es mía"))).toMatch(/Solo el asesino/);
  });

  it("una víctima que no murió de la Mafia no tiene nota que cambiar", () => {
    const s = morningOfDayThree();
    expect(rejected(s, write("p1", "p3", "x"))).toMatch(/Solo el asesino/);
  });

  it("la nota tiene como máximo 400 caracteres (Death_Note_ToS.md:15)", () => {
    const s = morningOfDayThree();
    expect(rejected(s, write("p1", "p2", "a".repeat(400)))).toBeNull();
    expect(rejected(s, write("p1", "p2", "a".repeat(401)))).toMatch(/400 caracteres/);
  });

  it("la autoría va en un evento privado para el asesino; el público solo trae la nota de la muerte (Death_Note_ToS.md:5; Godfather.md:235)", () => {
    const night = step(game(["godfather", "investigator", "sheriff", "doctor"], { dayNumber: 2 }), kill("p1", "p2", "Nota original")).state;
    const events = step(night, timer()).events;
    expect(ofType(events, "death.note.authored").map((e) => [e.visibility, e.audiencePlayerId])).toEqual([["private", "p1"]]);
    expect(ofType(events, "player.killed").map((e) => e.payload.note)).toEqual(["Nota original"]);
  });
});
