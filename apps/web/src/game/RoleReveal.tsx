import { useState } from "react";
import { motion } from "motion/react";
import type { MatchView } from "../types.js";
import { ROLE_BLURB, ROLE_NAMES, roleNameEs } from "../lib/roles.js";
import { Button, Card } from "../ui/primitives.js";

/** Clave por partida: la revelación se enseña una sola vez en este navegador. */
const key = (matchId: string) => `pueblo:reveal:${matchId}`;

function alreadySeen(matchId: string): boolean {
  try {
    return localStorage.getItem(key(matchId)) === "1";
  } catch {
    return false;
  }
}

function markSeen(matchId: string) {
  try {
    localStorage.setItem(key(matchId), "1");
  } catch {
    // Sin almacenamiento (navegación privada): la rueda volverá a salir, nada más.
  }
}

const RADIUS = 138;
const SPINS = 5;

/**
 * Rueda de roles, como en Town of Salem: los roles de la partida giran y se frenan
 * con tu rol justo arriba, delante del puntero.
 */
function RoleWheel({ names, target, onDone }: { names: string[]; target: number; onDone: () => void }) {
  const step = 360 / names.length;
  // Gira SPINS vueltas y termina con el hueco `target` en la parte de arriba (ángulo 0).
  const finalAngle = 360 * SPINS - target * step;
  return (
    <div className="relative mx-auto my-4 size-[21rem] max-w-full" aria-hidden="true">
      <div className="absolute left-1/2 -top-2 z-10 -translate-x-1/2 border-x-[12px] border-b-[20px] border-x-transparent border-b-blood" />
      <motion.div
        className="absolute inset-0 rounded-full border-4 border-ink bg-sun"
        initial={{ rotate: 0 }}
        animate={{ rotate: finalAngle }}
        transition={{ duration: 4.2, ease: [0.12, 0.75, 0.2, 1] }}
        onAnimationComplete={onDone}
      >
        {names.map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="absolute left-1/2 top-1/2 whitespace-nowrap font-display text-xs text-ink"
            style={{ transform: `translate(-50%, -50%) rotate(${i * step}deg) translateY(-${RADIUS}px) rotate(${-i * step}deg)` }}
          >
            {name}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/**
 * Revelación del rol al empezar. La rueda gira con los roles de la partida; al parar, se
 * enseña tu rol, su bando y su descripción.
 */
export function RoleReveal({ view }: { view: MatchView }) {
  const [open, setOpen] = useState(() => view.me.roleKey !== null && !alreadySeen(view.matchId));
  const [spinning, setSpinning] = useState(true);
  // Roles distintos, en orden estable: cada uno aparece una vez en la rueda.
  const unique = [...new Set(view.rolesInGame.map((r) => r.key))];
  const names = unique.map((k) => ROLE_NAMES[k]?.es ?? k);
  const target = Math.max(0, unique.indexOf(view.me.roleKey ?? ""));
  const mine = roleNameEs(view.me.roleKey) ?? view.me.roleName ?? "";
  const faction = view.me.faction === "mafia" ? "Mafia" : "Pueblo";

  if (!open) return null;
  const close = () => {
    markSeen(view.matchId);
    setOpen(false);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Tu rol" className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/70 p-4">
      <Card className="w-full max-w-sm text-center">
        <p className="font-semibold">{spinning ? "Repartiendo roles…" : "Tu rol es"}</p>
        {spinning && names.length > 0 ? (
          <RoleWheel names={names} target={target} onDone={() => setSpinning(false)} />
        ) : (
          <motion.p
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="my-4 font-display text-5xl"
          >
            {mine}
          </motion.p>
        )}
        {!spinning && (
          <>
            <p className="font-semibold">Bando: {faction}</p>
            {view.me.roleKey && ROLE_BLURB[view.me.roleKey] && <p className="mt-2 text-sm">{ROLE_BLURB[view.me.roleKey]}</p>}
            <Button className="mt-5 w-full" onClick={close}>Entrar al pueblo</Button>
          </>
        )}
      </Card>
    </div>
  );
}
