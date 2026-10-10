import { motion } from "motion/react";
import type { MatchView, PublicPlayer } from "../types.js";
import { roleName } from "../lib/roles.js";
import { usedBodyMark } from "../lib/corpses.js";

interface Props {
  view: MatchView;
  selected: string[];
  /** Qué jugadores se pueden elegir como objetivo ahora. Los objetivos se eligen en la lista lateral, no aquí. */
  isPickable: (p: PublicPlayer) => boolean;
  onPick: (playerId: string) => void;
}

/** Color estable por asiento: cada jugador se reconoce de un vistazo. */
const tint = (seat: number) => `hsl(${(seat * 47) % 360} 65% 82%)`;

/**
 * El pueblo como tarjetas: número, inicial, nombre y píldoras de estado. Sin dibujo de fondo: lo que importa es leer
 * quién es cada uno. Lo que se ve de cada tarjeta depende de quién mira.
 */
export function PlayerGrid({ view, selected, isPickable, onPick }: Props) {
  const votesFor = (id: string) => Object.values(view.votes).filter((t) => t === id).length;
  const myTarget = view.me.nightAction?.targetId ?? null;
  const myVote = view.votes[view.me.id];

  return (
    <div aria-label="El pueblo" className="grid grid-cols-2 content-start gap-2 sm:grid-cols-3 lg:grid-cols-3 2xl:grid-cols-4 md:h-full md:auto-rows-fr">
      {view.players.map((p, i) => {
        const dead = p.status !== "alive";
        const isSelected = selected.includes(p.id);
        const isMe = p.id === view.me.id;
        const canPick = isPickable(p) && !isMe;
        return (
          <motion.button
            key={p.id}
            type="button"
            disabled={!canPick}
            onClick={() => onPick(p.id)}
            aria-label={`${p.nick}${dead ? ", muerto" : ""}`}
            aria-pressed={isSelected}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: dead ? 0.85 : 1 }}
            transition={{ delay: i * 0.02 }}
            className={`relative flex min-w-0 items-start gap-2 rounded-2xl border-4 border-ink p-2 text-left ${dead ? "bg-stone-200 grayscale" : "bg-paper"} ${isSelected ? "target-ring" : ""} ${canPick ? "cursor-pointer" : "cursor-default"}`}
          >
            <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sun font-display text-sm">
              {p.seat}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-ink font-display text-base text-ink"
                  style={dead ? undefined : { background: tint(p.seat) }}
                >
                  {dead ? "✝" : p.nick.charAt(0).toUpperCase()}
                </span>
                <span className="block min-w-0 truncate font-display text-base">{p.nick}{isMe ? " (tú)" : ""}</span>
              </span>
              <span className="mt-1 flex min-h-5 flex-wrap gap-1 text-[11px] font-semibold">
                {myTarget === p.id && <Tag className="bg-blood text-paper">Objetivo</Tag>}
                {myVote === p.id && <Tag className="bg-sunset">Tu voto</Tag>}
                {view.defendantId === p.id && <Tag className="bg-blood text-paper">Acusado</Tag>}
                {p.ally && <Tag className="bg-mafia text-paper">Mafia</Tag>}
                {!dead && votesFor(p.id) > 0 && <Tag>{votesFor(p.id)} voto{votesFor(p.id) > 1 ? "s" : ""}</Tag>}
                {dead && <Tag className="bg-ink text-paper">{p.revealedRoleKey ? `Muerto · ${roleName(p.revealedRoleKey)}` : "Muerto"}</Tag>}
                {usedBodyMark(view, p) && <Tag className="bg-stone-600 text-paper">Cuerpo usado ⚰</Tag>}
                {p.isBot && <Tag>Bot</Tag>}
                {!p.connected && <Tag>Desconectado</Tag>}
              </span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

function Tag({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`rounded-full border-2 border-ink bg-white px-1.5 leading-tight ${className}`}>{children}</span>;
}
