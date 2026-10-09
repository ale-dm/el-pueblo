import { motion } from "motion/react";
import type { MatchView } from "../types.js";
import { Pill } from "../ui/primitives.js";
import { ROLE_NAMES } from "../lib/roles.js";

interface Props {
  view: MatchView;
  selected: string[];
  /** Si true, tocar a un jugador lo selecciona como objetivo. */
  selectable: boolean;
  onPick: (playerId: string) => void;
}

/** Color estable por asiento: cada vecino se reconoce de un vistazo. */
const avatarColor = (seat: number) => `hsl(${(seat * 47) % 360} 70% 62%)`;

/** El pueblo: una casa-avatar por jugador, con sus etiquetas. Lo que se ve depende de quién mira. */
export function PlayerGrid({ view, selected, selectable, onPick }: Props) {
  const votesFor = (id: string) => Object.values(view.votes).filter((t) => t === id).length;
  const myTarget = view.me.nightAction?.targetId ?? null;
  const myVote = view.votes[view.me.id];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
      {view.players.map((p, i) => {
        const dead = p.status !== "alive";
        const isSelected = selected.includes(p.id);
        const isMe = p.id === view.me.id;
        const roleKey = p.revealedRoleKey;
        return (
          <motion.button
            key={p.id}
            type="button"
            disabled={!selectable || dead || isMe}
            onClick={() => onPick(p.id)}
            aria-label={`${p.nick}${dead ? ", muerto" : ""}`}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: dead ? 0.85 : 1 }}
            transition={{ delay: i * 0.03 }}
            className={`cartoon-card relative min-w-0 p-3 text-left ${isSelected ? "target-ring" : ""} ${dead ? "grayscale" : ""}`}
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full border-4 border-ink font-display text-lg text-ink"
                style={{ background: avatarColor(p.seat) }}
              >
                {dead ? "✝" : p.nick.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-display text-lg">{p.nick}</span>
                {p.ally && <span className="block text-xs font-semibold text-mafia">Compañero de Mafia</span>}
              </span>
            </span>
            <div className="mt-2 flex flex-wrap gap-1 text-xs">
              {isMe && <Pill>Tú</Pill>}
              {myTarget === p.id && <Pill className="bg-blood text-paper">Tu objetivo</Pill>}
              {myVote === p.id && <Pill className="bg-sunset">Tu voto</Pill>}
              {view.defendantId === p.id && <Pill className="bg-blood text-paper">Acusado</Pill>}
              {p.isBot && <Pill>Bot</Pill>}
              {!p.connected && <Pill>Desconectado</Pill>}
              {dead && <Pill className="bg-ink text-paper">{roleKey ? `Muerto · ${ROLE_NAMES[roleKey]?.es ?? roleKey}` : "Muerto"}</Pill>}
              {!dead && votesFor(p.id) > 0 && <Pill>{votesFor(p.id)} voto{votesFor(p.id) > 1 ? "s" : ""}</Pill>}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
