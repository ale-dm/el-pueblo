import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { MatchView } from "../types.js";
import { ROLE_BLURB, ROLE_NAMES, roleNameEs } from "../lib/roles.js";
import { Button, Card } from "../ui/primitives.js";

/** Clave por jugador y partida: la revelación se enseña una sola vez en este navegador. */
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
    // Sin almacenamiento (navegación privada): la revelación volverá a salir, nada más.
  }
}

/**
 * Revelación del rol al empezar, como la rueda de Town of Salem: los nombres de los roles de la
 * partida pasan deprisa y se detiene en el tuyo.
 */
export function RoleReveal({ view }: { view: MatchView }) {
  const [open, setOpen] = useState(() => view.me.roleKey !== null && !alreadySeen(view.matchId));
  const [spinning, setSpinning] = useState(true);
  const [index, setIndex] = useState(0);
  const names = view.rolesInGame.map((k) => ROLE_NAMES[k]?.es ?? k);
  const mine = roleNameEs(view.me.roleKey) ?? view.me.roleName ?? "";
  const faction = view.me.faction === "mafia" ? "Mafia" : "Pueblo";

  useEffect(() => {
    if (!open) return;
    const spin = setInterval(() => setIndex((i) => i + 1), 90);
    const stop = setTimeout(() => {
      clearInterval(spin);
      setSpinning(false);
    }, 2000);
    return () => {
      clearInterval(spin);
      clearTimeout(stop);
    };
  }, [open]);

  if (!open) return null;
  const close = () => {
    markSeen(view.matchId);
    setOpen(false);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Tu rol" className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-6">
      <Card className="w-full max-w-sm text-center">
        <p className="font-semibold">Tu rol es</p>
        <p className="my-4 min-h-16 font-display text-5xl" aria-live="polite">
          {spinning ? (names.length ? names[index % names.length] : "…") : (
            <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-block">
              {mine}
            </motion.span>
          )}
        </p>
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
