import { useEffect, useState } from "react";
import { useGame } from "../state/store.js";
import type { MatchView } from "../types.js";
import { Button, Card } from "../ui/primitives.js";

const MAX_WILL = 300;

/** Última voluntad: se escribe mientras vives y se revela al morir. */
export function WillCard({ me }: { me: MatchView["me"] }) {
  const send = useGame((s) => s.send);
  const busy = useGame((s) => s.busy);
  const [text, setText] = useState(me.will ?? "");
  useEffect(() => setText(me.will ?? ""), [me.will]);
  if (me.status !== "alive") return null;

  const saved = me.will ?? "";
  return (
    <Card>
      <h3 className="font-display text-xl">Tu testamento</h3>
      <p className="mb-2 text-sm">Solo lo ves tú. Si mueres, se revela a todo el pueblo.</p>
      <textarea
        aria-label="Testamento"
        className="cartoon-input min-h-20 resize-y"
        maxLength={MAX_WILL}
        value={text}
        placeholder="Lo que quieres que se sepa de ti…"
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-xs">{text.length}/{MAX_WILL}</span>
        <Button disabled={busy || text.trim() === saved} onClick={() => void send({ type: "will.write", playerId: me.id, text: text.trim() })}>
          Guardar testamento
        </Button>
      </div>
    </Card>
  );
}
