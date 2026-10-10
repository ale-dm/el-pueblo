import type { MatchView } from "../types.js";
import { roleName } from "../lib/roles.js";
import { Card } from "../ui/primitives.js";

/** Cementerio: los muertos, con su número y el rol que se conoce. Panel fijo a la izquierda en escritorio. */
export function Graveyard({ view, className = "" }: { view: MatchView; className?: string }) {
  const dead = view.players.filter((p) => p.status !== "alive");
  return (
    <Card className={`flex min-h-0 flex-col p-2 ${className}`}>
      <h2 className="mb-1 text-center font-display text-base">Cementerio</h2>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto text-xs">
        {dead.length === 0 && <li className="opacity-70">Nadie ha muerto todavía.</li>}
        {dead.map((p) => (
          <li key={p.id} className="flex min-w-0 items-center gap-1">
            <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sun font-display text-[10px]">
              {p.seat}
            </span>
            <span className="truncate font-semibold">{p.nick}</span>
            {p.revealedRoleKey && <span className="truncate opacity-80">({roleName(p.revealedRoleKey)})</span>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
