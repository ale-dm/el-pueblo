import { describe, expect, it } from "vitest";
import { deathNoteWindowOpen, editableDeathNotes } from "./deathNote.js";
import type { GameEvent } from "../types.js";

let seq = 0;
const ev = (type: string, payload: Record<string, any>, audiencePlayerId: string | null = null): GameEvent => ({
  seq: ++seq, type, payload, visibility: audiencePlayerId ? "private" : "public", audiencePlayerId,
});

// Noche 2 de la partida: la muerte se anuncia en la mañana 3 (wiki: Death_Note_ToS.md:5, 17).
const authored = (note = "Culpable.") => ev("death.note.authored", { victimId: "p2", authorId: "p1", dayNumber: 3, note }, "p1");

describe("ventana de la nota de muerte (wiki: Death_Note_ToS.md:17)", () => {
  it("abierta en day_1 y discussion solo la mañana que anuncia la víctima", () => {
    expect(deathNoteWindowOpen("day_1", 3, 3)).toBe(true);
    expect(deathNoteWindowOpen("discussion", 3, 3)).toBe(true);
    expect(deathNoteWindowOpen("discussion", 4, 3)).toBe(false);
    expect(deathNoteWindowOpen("night", 3, 3)).toBe(false);
    expect(deathNoteWindowOpen("voting", 3, 3)).toBe(false);
  });
});

describe("notas que el jugador puede cambiar", () => {
  it("el autor ve su nota en la mañana del anuncio", () => {
    expect(editableDeathNotes([authored()], "p1", "discussion", 3)).toEqual([{ victimId: "p2", note: "Culpable.", announcedDay: 3 }]);
  });

  it("otro jugador no ve la nota de un asesino ajeno", () => {
    expect(editableDeathNotes([authored()], "p9", "discussion", 3)).toEqual([]);
  });

  it("fuera de la mañana del anuncio no hay nota que cambiar", () => {
    expect(editableDeathNotes([authored()], "p1", "voting", 3)).toEqual([]);
    expect(editableDeathNotes([authored()], "p1", "discussion", 4)).toEqual([]);
  });

  it("usa la última nota escrita (death.note.written) si el autor la cambió", () => {
    const events = [authored("Primera."), ev("death.note.written", { victimId: "p2", note: "Segunda." })];
    expect(editableDeathNotes(events, "p1", "discussion", 3)).toEqual([{ victimId: "p2", note: "Segunda.", announcedDay: 3 }]);
  });
});
