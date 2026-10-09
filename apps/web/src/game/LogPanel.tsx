import { useEffect, useMemo, useRef } from "react";
import type { GameEvent, MatchView } from "../types.js";
import { Card } from "../ui/primitives.js";
import { buildLog, logContext, type LogTone } from "../lib/log.js";

const TONE: Record<LogTone, string> = {
  info: "",
  private: "italic text-moon",
  danger: "font-semibold text-blood",
  good: "font-semibold text-town",
};

/** Registro de la partida en orden, con separadores de día y noche. Se sigue la última línea. */
export function LogPanel({ view, log, compact = false }: { view: MatchView; log: GameEvent[]; compact?: boolean }) {
  const end = useRef<HTMLLIElement>(null);
  const items = useMemo(() => buildLog(log, logContext(view)), [log, view]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [items.length]);

  return (
    <Card className={compact ? "p-2" : ""}>
      {!compact && <h3 className="mb-2 font-display text-xl">Registro</h3>}
      <ul className={`${compact ? "max-h-24" : "max-h-72"} space-y-1 overflow-y-auto pr-1 text-sm`}>
        {items.length === 0 && <li>La partida acaba de empezar.</li>}
        {items.map((item) =>
          item.kind === "separator" ? (
            <li key={item.key} className={`my-2 rounded-xl px-2 py-1 text-center font-display text-base ${item.night ? "bg-moon text-paper" : "bg-sun text-ink"} border-2 border-ink`}>
              {item.text}
            </li>
          ) : (
            <li key={item.key} className={TONE[item.tone]}>• {item.text}</li>
          ),
        )}
        <li ref={end} aria-hidden="true" />
      </ul>
    </Card>
  );
}
