import type { MatchView, PublicPlayer } from "../types.js";
import { roleName } from "../lib/roles.js";
import { Card } from "../ui/primitives.js";

export type LiveTab = "live" | "dead";

interface Props {
  view: MatchView;
  tab: LiveTab;
  onTab: (t: LiveTab) => void;
  className?: string;
  /** Objetivos elegidos ahora. Esta lista es la única superficie de selección: no hay jugadores en el centro. */
  selected?: string[];
  isPickable?: (p: PublicPlayer) => boolean;
  onPick?: (playerId: string) => void;
}

/**
 * Lista de jugadores: vivos y muertos. Aquí se eligen los objetivos, y cada fila muestra su número, su rol si se
 * conoce, sus votos y si es el acusado.
 */
export function LiveList({ view, tab, onTab, className = "", selected = [], isPickable, onPick }: Props) {
  const live = view.players.filter((p) => p.status === "alive");
  const dead = view.players.filter((p) => p.status !== "alive");
  const shown = tab === "live" ? live : dead;
  const votesFor = (id: string) => Object.values(view.votes).filter((t) => t === id).length;

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
            className={`short-tab px-2 py-2 font-display text-base uppercase ${tab === t ? "bg-sun" : "bg-paper opacity-70"}`}
          >
            {t === "live" ? `Vivos (${live.length})` : `Muertos (${dead.length})`}
          </button>
        ))}
      </div>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {shown.map((p) => {
          // Tu rol; el de un muerto (revelado); y, si eres Mafia, el de tus compañeros vivos.
          const role = p.id === view.me.id ? roleName(view.me.roleKey) : roleName(p.revealedRoleKey ?? p.allyRoleKey);
          const picked = selected.includes(p.id);
          const pickable = Boolean(onPick && isPickable?.(p));
          const votes = votesFor(p.id);
          const body = (
            <>
              <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sun font-display text-sm">
                {p.seat}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{p.nick}{p.id === view.me.id ? " (tú)" : ""}</span>
                {/* El rol del compañero de Mafia se ve también en horizontal: es lo que se pidió saber. */}
                {role && <span className={`${p.ally ? "" : "short-hide"} block truncate text-xs ${p.ally ? "text-mafia" : "opacity-80"}`}>{role}</span>}
              </span>
              <span className="flex shrink-0 flex-col items-end gap-0.5 text-[10px] font-semibold">
                {p.ally && <Tag className="bg-mafia text-paper">Mafia</Tag>}
                {picked && view.votes[view.me.id] !== p.id && <Tag className="bg-blood text-paper">Objetivo</Tag>}
                {view.defendantId === p.id && <Tag className="bg-blood text-paper">Acusado</Tag>}
                {view.votes[view.me.id] === p.id && <Tag className="bg-sunset">Tu voto</Tag>}
                {votes > 0 && p.status === "alive" && <Tag>{votes} {votes === 1 ? "voto" : "votos"}</Tag>}
                {p.isBot && <Tag>BOT</Tag>}
              </span>
            </>
          );
          const base = "short-row flex w-full items-center gap-2 rounded-xl border-2 border-ink bg-white/70 px-2 py-1 text-left";
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
    </Card>
  );
}

/** Etiqueta pequeña de una fila: el fondo blanco solo si el caso no pone el suyo. */
function Tag({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ownBg = /\bbg-/.test(className);
  return <span className={`rounded-full border-2 border-ink px-1 leading-4 ${ownBg ? "" : "bg-white"} ${className}`}>{children}</span>;
}
