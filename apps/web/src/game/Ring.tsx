import { motion } from "motion/react";
import type { MatchView, PublicPlayer } from "../types.js";
import { Pill } from "../ui/primitives.js";

interface Props {
  view: MatchView;
  selected: string[];
  /** Qué jugadores se pueden elegir como objetivo ahora. */
  isPickable: (p: PublicPlayer) => boolean;
  onPick: (playerId: string) => void;
}

const houseColor = (seat: number) => `hsl(${(seat * 47) % 360} 65% 78%)`;

/**
 * El pueblo en círculo, como en Town of Salem: cada casa en su sitio alrededor de la plaza,
 * con la tuya abajo, en el centro de tu mesa. En medio, la horca cuando hay juicio.
 */
export function Ring({ view, selected, isPickable, onPick }: Props) {
  const n = view.players.length;
  const meIndex = Math.max(0, view.players.findIndex((p) => p.id === view.me.id));
  const votesFor = (id: string) => Object.values(view.votes).filter((t) => t === id).length;
  const myTarget = view.me.nightAction?.targetId ?? null;
  const myVote = view.votes[view.me.id];
  const defendant = view.players.find((p) => p.id === view.defendantId);

  return (
    <div className="ring-compact relative h-full min-h-[14rem] w-full" aria-label="El pueblo">
      {/* Plaza */}
      <div aria-hidden="true" className="absolute left-1/2 top-1/2 size-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-ink bg-[radial-gradient(circle,#fff8e7,#f3d9a4)] opacity-70" />

      {/* Horca: solo durante un juicio */}
      {defendant && (
        <div aria-hidden="true" className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <span className="block h-16 w-2 rounded bg-ink" />
          <span className="block h-2 w-16 rounded bg-ink" />
          <span className="-mt-1 block size-4 rounded-full border-2 border-ink bg-blood" />
          <span className="mt-1 whitespace-nowrap font-display text-sm">{defendant.nick}</span>
        </div>
      )}

      {view.players.map((p, i) => {
        // Yo abajo; los demás en sentido horario según su asiento en la mesa.
        const angle = Math.PI / 2 + ((i - meIndex) * 2 * Math.PI) / n;
        const left = 50 + 44 * Math.cos(angle);
        const top = 52 + 37 * Math.sin(angle);
        const dead = p.status !== "alive";
        const isMe = p.id === view.me.id;
        const isSelected = selected.includes(p.id);
        const canPick = isPickable(p) && !isMe;
        return (
          <motion.button
            key={p.id}
            type="button"
            disabled={!canPick}
            onClick={() => onPick(p.id)}
            aria-label={`${p.nick}${dead ? ", muerto" : ""}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: dead ? 0.9 : 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            style={{ left: `${left}%`, top: `${top}%` }}
            className="absolute flex w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center"
          >
            <span className="block max-w-full truncate whitespace-nowrap font-display text-sm drop-shadow-[1px_1px_0_var(--color-paper)]">
              {p.nick}
            </span>
            {/* Casa */}
            <span aria-hidden="true" className="h-0 w-0 border-x-[24px] border-b-[15px] border-x-transparent border-b-ink" />
            <span
              className={`relative flex w-14 flex-col items-center rounded-b-lg border-4 border-ink px-1 pb-1 pt-2 ${isSelected ? "target-ring" : ""} ${dead ? "bg-stone-300 grayscale" : ""}`}
              style={dead ? undefined : { background: houseColor(p.seat) }}
            >
              <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full border-2 border-ink bg-paper font-display text-sm">
                {dead ? "✝" : p.nick.charAt(0).toUpperCase()}
              </span>
            </span>
            <span className="mt-0.5 flex flex-wrap justify-center gap-0.5 text-[10px]">
              {isMe && <Pill>Tú</Pill>}
              {myTarget === p.id && <Pill className="bg-blood text-paper">Objetivo</Pill>}
              {myVote === p.id && <Pill className="bg-sunset">Voto</Pill>}
              {p.ally && <Pill className="bg-mafia text-paper">Mafia</Pill>}
              {dead && <Pill className="bg-ink text-paper">Muerto</Pill>}
              {!dead && votesFor(p.id) > 0 && <Pill>{votesFor(p.id)}</Pill>}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
