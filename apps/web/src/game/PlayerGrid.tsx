import { motion } from "motion/react";
import type { MatchView } from "../types.js";
import { Pill } from "../ui/primitives.js";

interface Props {
  view: MatchView;
  selected: string[];
  /** Si true, tocar a un jugador lo selecciona como objetivo. */
  selectable: boolean;
  onPick: (playerId: string) => void;
}

export function PlayerGrid({ view, selected, selectable, onPick }: Props) {
  const received = (id: string) => Object.values(view.votes).filter((t) => t === id).length;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
      {view.players.map((p, i) => {
        const dead = p.status !== "alive";
        const isSelected = selected.includes(p.id);
        const isMe = p.id === view.me.id;
        return (
          <motion.button
            key={p.id}
            type="button"
            disabled={!selectable || dead || isMe}
            onClick={() => onPick(p.id)}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: dead ? 0.55 : 1 }}
            transition={{ delay: i * 0.03 }}
            className={`cartoon-card relative min-w-0 p-3 text-left ${isSelected ? "target-ring" : ""} ${dead ? "grayscale" : ""}`}
          >
            <span className="block truncate font-display text-lg">{p.nick}</span>
            <span className="block text-xs font-semibold">Asiento {p.seat}</span>
            <div className="mt-1 flex flex-wrap gap-1 text-xs">
              {isMe && <Pill>Tú</Pill>}
              {view.defendantId === p.id && <Pill className="bg-blood text-paper">Acusado</Pill>}
              {!p.connected && <Pill>Desconectado</Pill>}
              {dead && <Pill className="bg-ink text-paper">{p.revealedRoleKey ? `Muerto · ${p.revealedRoleKey}` : "Muerto"}</Pill>}
              {!dead && received(p.id) > 0 && <Pill>{received(p.id)} voto{received(p.id) > 1 ? "s" : ""}</Pill>}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
