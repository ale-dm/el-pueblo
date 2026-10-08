import type { GameEvent, MatchView } from "../types.js";
import { Card } from "../ui/primitives.js";
import { eventLine } from "../lib/text.js";

/** Registro de la partida en español. Las líneas de chat se muestran en su canal, no aquí. */
export function LogPanel({ view, log }: { view: MatchView; log: GameEvent[] }) {
  const nick = (id: string) => view.players.find((p) => p.id === id)?.nick ?? "?";
  const lines = log
    .filter((e) => e.type !== "chat.message")
    .map((e) => ({ seq: e.seq, text: eventLine(e, nick) }))
    .filter((l): l is { seq: number; text: string } => l.text !== null)
    .slice(-60)
    .reverse();
  return (
    <Card>
      <h3 className="mb-2 font-display text-xl">Registro</h3>
      <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
        {lines.map((l) => <li key={l.seq}>• {l.text}</li>)}
        {lines.length === 0 && <li>La partida acaba de empezar.</li>}
      </ul>
    </Card>
  );
}
