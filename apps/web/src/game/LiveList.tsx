import type { ReactNode } from "react";
import type { MatchView, PublicPlayer } from "../types.js";
import { roleName } from "../lib/roles.js";
import { Card } from "../ui/primitives.js";

export type LiveTab = "live" | "dead";

interface Props {
  view: MatchView;
  tab: LiveTab;
  onTab: (t: LiveTab) => void;
  footer?: ReactNode;
  className?: string;
  /** Objetivos elegidos ahora. Los jugadores se eligen desde esta lista, no desde el tablero (como en Town of Salem). */
  selected?: string[];
  isPickable?: (p: PublicPlayer) => boolean;
  onPick?: (playerId: string) => void;
}

/** Lista de vivos (y cementerio), con su número de asiento: "All Live Townies" en Town of Salem. Aquí se eligen los objetivos. */
export function LiveList({ view, tab, onTab, footer, className = "", selected = [], isPickable, onPick }: Props) {
  const live = view.players.filter((p) => p.status === "alive");
  const dead = view.players.filter((p) => p.status !== "alive");
  const shown = tab === "live" ? live : dead;

  return (
    <Card className={`flex min-h-0 flex-col p-0 ${className}`}>
      <div role="tablist" className="grid grid-cols-2 border-b-4 border-ink">
        {(["live", "dead"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            type="button"
            onClick={() => onTab(t)}
            className={`px-2 py-2 font-display text-base uppercase ${tab === t ? "bg-sun" : "bg-paper opacity-70"}`}
          >
            {t === "live" ? `Vivos (${live.length})` : `Muertos (${dead.length})`}
          </button>
        ))}
      </div>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {shown.map((p) => {
          const role = p.id === view.me.id ? roleName(view.me.roleKey) : p.revealedRoleKey ? roleName(p.revealedRoleKey) : null;
          const picked = selected.includes(p.id);
          const pickable = Boolean(onPick && isPickable?.(p));
          const body = (
            <>
              <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sun font-display text-sm">
                {p.seat}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{p.nick}{p.id === view.me.id ? " (tú)" : ""}</span>
                {role && <span className={`block truncate text-xs ${p.ally ? "text-mafia" : "opacity-80"}`}>{role}</span>}
              </span>
              {picked && <span className="shrink-0 rounded-full border-2 border-ink bg-blood px-2 text-[11px] font-display text-paper">Objetivo</span>}
              {p.isBot && <span className="text-[10px] font-semibold">BOT</span>}
            </>
          );
          const base = "flex w-full items-center gap-2 rounded-xl border-2 border-ink bg-white/70 px-2 py-1 text-left";
          return (
            <li key={p.id}>
              {pickable ? (
                <button
                  type="button"
                  aria-pressed={picked}
                  onClick={() => onPick?.(p.id)}
                  className={`${base} cursor-pointer hover:bg-sun/60 ${picked ? "target-ring" : ""}`}
                >
                  {body}
                </button>
              ) : (
                <div className={base}>{body}</div>
              )}
            </li>
          );
        })}
        {shown.length === 0 && <li className="text-sm">Nadie por aquí.</li>}
      </ul>
      {footer}
    </Card>
  );
}
