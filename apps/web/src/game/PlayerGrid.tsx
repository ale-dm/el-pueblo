import { motion } from "motion/react";
import type { MatchView, PublicPlayer } from "../types.js";
import { Pill } from "../ui/primitives.js";
import { roleName } from "../lib/roles.js";

interface Props {
  view: MatchView;
  selected: string[];
  /** Qué jugadores se pueden elegir como objetivo ahora. */
  isPickable: (p: PublicPlayer) => boolean;
  onPick: (playerId: string) => void;
}

/** Color estable por asiento: cada vecino se reconoce de un vistazo. */
const houseColor = (seat: number) => `hsl(${(seat * 47) % 360} 65% 78%)`;

/**
 * El pueblo: una casa por jugador, en calle. Como en Town of Salem cada casa lleva a su dueño;
 * tu casa lleva marca. Lo que se ve de cada casa depende de quién mira.
 */
export function PlayerGrid({ view, selected, isPickable, onPick }: Props) {
  const votesFor = (id: string) => Object.values(view.votes).filter((t) => t === id).length;
  const myTarget = view.me.nightAction?.targetId ?? null;
  const myVote = view.votes[view.me.id];

  return (
    <section aria-label="El pueblo" className="rounded-[2rem] border-4 border-ink bg-[linear-gradient(180deg,rgba(255,255,255,0.35),rgba(255,255,255,0))] p-3 md:p-4">
      <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {view.players.map((p, i) => {
          const dead = p.status !== "alive";
          const isSelected = selected.includes(p.id);
          const isMe = p.id === view.me.id;
          const canPick = isPickable(p) && !isMe;
          const roleKey = p.revealedRoleKey;
          return (
            <motion.button
              key={p.id}
              type="button"
              disabled={!canPick}
              onClick={() => onPick(p.id)}
              aria-label={`${p.nick}${dead ? ", muerto" : ""}`}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: dead ? 0.9 : 1 }}
              transition={{ delay: i * 0.03 }}
              className={`group relative flex min-w-0 flex-col items-center text-center ${canPick ? "cursor-pointer" : "cursor-default"}`}
            >
              {/* Tejado */}
              <span aria-hidden="true" className="h-0 w-0 border-x-[46px] border-b-[30px] border-x-transparent border-b-ink" />
              {/* Casa */}
              <span
                className={`relative flex w-full flex-col items-center gap-1 rounded-b-xl border-4 border-ink px-2 pb-2 pt-3 transition ${isSelected ? "target-ring" : ""} ${dead ? "bg-stone-300 grayscale" : "bg-paper"}`}
                style={dead ? undefined : { background: houseColor(p.seat) }}
              >
                <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full border-4 border-ink bg-paper font-display text-lg text-ink">
                  {dead ? "✝" : p.nick.charAt(0).toUpperCase()}
                </span>
                <span className="block w-full truncate font-display text-base text-ink">{p.nick}</span>
                {/* Puerta: marca la casa de quien eres tú */}
                {isMe && <span aria-hidden="true" className="absolute -bottom-1 left-1/2 h-3 w-4 -translate-x-1/2 rounded-t-md border-2 border-ink bg-sun" />}
              </span>
              <div className="mt-1 flex min-h-6 flex-wrap justify-center gap-1 text-xs">
                {isMe && <Pill>Tu casa</Pill>}
                {myTarget === p.id && <Pill className="bg-blood text-paper">Tu objetivo</Pill>}
                {myVote === p.id && <Pill className="bg-sunset">Tu voto</Pill>}
                {view.defendantId === p.id && <Pill className="bg-blood text-paper">Acusado</Pill>}
                {p.ally && <Pill className="bg-mafia text-paper">Mafia</Pill>}
                {p.isBot && <Pill>Bot</Pill>}
                {!p.connected && <Pill>Desconectado</Pill>}
                {dead && <Pill className="bg-ink text-paper">{roleKey ? `Muerto · ${roleName(roleKey)}` : "Muerto"}</Pill>}
                {!dead && votesFor(p.id) > 0 && <Pill>{votesFor(p.id)} voto{votesFor(p.id) > 1 ? "s" : ""}</Pill>}
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
