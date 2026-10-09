import type { GameEvent } from "../types.js";

/** Nota de muerte: hasta 400 caracteres (wiki: Death_Note_ToS.md:15). Debe coincidir con el motor (`MAX_DEATH_NOTE`). */
export const MAX_DEATH_NOTE = 400;

/** Una nota que su autor puede cambiar ahora: víctima, texto actual y la mañana que la anuncia. */
export interface EditableDeathNote {
  victimId: string;
  note: string;
  announcedDay: number;
}

/**
 * Ventana para cambiar la nota (wiki: Death_Note_ToS.md:17, "while the victims are being announced in the morning"):
 * la mañana que anuncia la víctima, en day_1 o discussion. Espejo de `writeDeathNote` en el motor.
 */
export function deathNoteWindowOpen(phase: string | null, dayNumber: number, announcedDay: number): boolean {
  return (phase === "day_1" || phase === "discussion") && dayNumber === announcedDay;
}

/**
 * Notas de muerte que este jugador puede cambiar: las que él escribió (`death.note.authored`, privado para el autor),
 * con la última versión (`death.note.written`, público), filtradas por la ventana de la mañana.
 */
export function editableDeathNotes(events: readonly GameEvent[], meId: string, phase: string | null, dayNumber: number): EditableDeathNote[] {
  const byVictim = new Map<string, EditableDeathNote & { seq: number }>();
  for (const e of events) {
    if (e.type === "death.note.authored" && e.payload.authorId === meId) {
      byVictim.set(e.payload.victimId, { victimId: e.payload.victimId, note: e.payload.note ?? "", announcedDay: e.payload.dayNumber, seq: e.seq });
    } else if (e.type === "death.note.written") {
      const current = byVictim.get(e.payload.victimId);
      if (current && e.seq > current.seq) current.note = e.payload.note ?? "";
    }
  }
  return [...byVictim.values()]
    .filter((n) => deathNoteWindowOpen(phase, dayNumber, n.announcedDay))
    .map(({ seq: _seq, ...rest }) => rest);
}
