import { useMemo, useState } from "react";
import { useGame } from "../state/store.js";
import type { MatchView } from "../types.js";
import { MAX_DEATH_NOTE, editableDeathNotes, type EditableDeathNote } from "../lib/deathNote.js";
import { Button, Card } from "../ui/primitives.js";

/**
 * Nota de muerte que el asesino puede cambiar durante el anuncio de la mañana (wiki: Death_Note_ToS.md:13, 17).
 * No se muestra fuera de esa ventana, ni a quien no ha escrito una nota, ni a un asesino muerto (el motor lo rechaza).
 */
export function DeathNoteCard({ view }: { view: MatchView }) {
  const log = useGame((s) => s.log);
  const notes = useMemo(() => editableDeathNotes(log, view.me.id, view.phase, view.dayNumber), [log, view.me.id, view.phase, view.dayNumber]);
  if (view.me.status !== "alive" || notes.length === 0) return null;
  return (
    <Card>
      <h3 className="font-display text-xl">Tu nota de muerte</h3>
      <p className="mb-2 text-sm">Puedes cambiarla mientras se anuncian las víctimas de la mañana. Se muestra a todo el pueblo.</p>
      <div className="space-y-3">
        {notes.map((n) => (
          <NoteEditor key={n.victimId} note={n} nick={view.players.find((p) => p.id === n.victimId)?.nick ?? "?"} meId={view.me.id} />
        ))}
      </div>
    </Card>
  );
}

function NoteEditor({ note, nick, meId }: { note: EditableDeathNote; nick: string; meId: string }) {
  const send = useGame((s) => s.send);
  const busy = useGame((s) => s.busy);
  const [text, setText] = useState(note.note);
  const saved = note.note.trim();
  return (
    <div>
      <p className="text-sm font-semibold">Víctima: {nick}</p>
      <textarea
        aria-label={`Nota de muerte de ${nick}`}
        className="cartoon-input min-h-16 w-full resize-y"
        maxLength={MAX_DEATH_NOTE}
        value={text}
        placeholder="Nota de muerte (vacía: se quita)"
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-xs">{text.length}/{MAX_DEATH_NOTE}</span>
        <Button
          disabled={busy || text.trim() === saved}
          onClick={() => void send({ type: "death.note.write", actorId: meId, victimId: note.victimId, note: text.trim() })}
        >
          Guardar nota
        </Button>
      </div>
    </div>
  );
}
