import type { MatchView, PublicPlayer } from "../types.js";
import { roleIconUrl } from "../lib/roleImages.js";

interface Props {
  view: MatchView;
  /** Jugadores marcados: el objetivo elegido, o tu voto. */
  selected: string[];
  isPickable: (p: PublicPlayer) => boolean;
  onPick: (playerId: string) => void;
}

/**
 * La mesa en móvil, como la cuadrícula de Wolvesville: una casilla por jugador, con su número y nombre, su rol si se
 * conoce (el tuyo, el de un muerto, el de un compañero de Mafia) y sus marcas: votos, acusado, objetivo, Mafia.
 * Tocar una casilla elige o vota, según la fase.
 */
export function Table({ view, selected, isPickable, onPick }: Props) {
  const votesFor = (id: string) => Object.values(view.votes).filter((t) => t === id).length;
  // Los votos son del día de la votación: fuera de ella, el mapa de votos guarda los del último día y no se enseña.
  const voting = view.phase === "voting";
  const myVote = voting ? view.votes[view.me.id] ?? null : null;

  return (
    <ul className="phone-table grid gap-2">
      {view.players.map((p) => {
        const dead = p.status !== "alive";
        const roleKey = p.id === view.me.id ? view.me.roleKey : p.revealedRoleKey ?? p.allyRoleKey;
        const icon = roleIconUrl(roleKey);
        const picked = selected.includes(p.id);
        const votes = voting ? votesFor(p.id) : 0;
        const pickable = isPickable(p);
        const body = (
          <>
            <span className="block truncate text-[11px] font-semibold leading-tight">
              {p.seat}. {p.nick}{p.id === view.me.id ? " (tú)" : ""}
            </span>
            <span className="flex min-h-0 flex-1 items-center justify-center py-0.5">
              {dead ? (
                <span aria-hidden="true" className="font-display text-2xl">✝</span>
              ) : icon ? (
                <img src={icon} alt="" className="max-h-full max-w-full flex-1 object-contain" />
              ) : (
                <span aria-hidden="true" className="font-display text-2xl">{p.seat}</span>
              )}
            </span>
            <span className="flex min-h-4 flex-wrap items-center justify-center gap-0.5 text-[10px] font-semibold">
              {p.ally && <Tag className="bg-mafia text-paper">Mafia</Tag>}
              {view.defendantId === p.id && <Tag className="bg-blood text-paper">Acusado</Tag>}
              {myVote === p.id && <Tag className="bg-sunset">Tu voto</Tag>}
              {picked && myVote !== p.id && <Tag className="bg-blood text-paper">Objetivo</Tag>}
              {votes > 0 && !dead && <Tag>{votes} {votes === 1 ? "voto" : "votos"}</Tag>}
              {p.isBot && <Tag>BOT</Tag>}
            </span>
          </>
        );
        const base = `flex h-full min-h-0 w-full flex-col gap-0.5 rounded-xl border-2 border-ink bg-white/70 p-1 text-left ${dead ? "opacity-60 grayscale" : ""}`;
        return (
          <li key={p.id} className="min-h-0">
            {pickable ? (
              <button
                type="button"
                aria-pressed={picked}
                onClick={() => onPick(p.id)}
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
    </ul>
  );
}

/** Etiqueta pequeña de una casilla: el fondo blanco solo si el caso no pone el suyo. */
function Tag({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ownBg = /\bbg-/.test(className);
  return <span className={`rounded-full border-2 border-ink px-1 leading-4 ${ownBg ? "" : "bg-white"} ${className}`}>{children}</span>;
}
