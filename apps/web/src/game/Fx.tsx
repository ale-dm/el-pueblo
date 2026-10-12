import { AnimatePresence, motion } from "motion/react";
import { avatarUrl } from "../lib/avatars.js";

/** Aviso a pantalla completa que se va solo: cae la noche, amanece, o alguien muere. */
export function ScreenBanner({ text, tone = "night" }: { text: string | null; tone?: "night" | "day" | "death" | "trial" }) {
  const bg = tone === "night" ? "bg-midnight" : tone === "day" ? "bg-sun" : tone === "trial" ? "bg-blood" : "bg-ink";
  const ink = tone === "day" ? "text-ink" : "text-paper";
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          key={text}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`pointer-events-none fixed inset-0 z-40 flex items-center justify-center ${bg}/80 p-6`}
        >
          <motion.p initial={{ scale: 0.8 }} animate={{ scale: 1 }} className={`text-center font-display text-5xl drop-shadow-[4px_4px_0_var(--color-ink)] ${ink}`}>
            {text}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Una muerte del reparto de la mañana: su personaje en gris, cómo murió, su rol y su testamento (si dejó uno).
 * Entra y sale sola; el padre la muestra una a una.
 */
export function DeathFx({ nick, seat, role, cause, will }: { nick: string; seat: number; role: string | null; cause: string; will: string | null }) {
  return (
    <motion.div
      role="status"
      aria-live="assertive"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-ink/75 p-6"
    >
      <motion.div initial={{ y: 40, rotate: -3 }} animate={{ y: 0, rotate: 0 }} className="cartoon-card max-w-sm p-5 text-center text-ink">
        <img src={avatarUrl(seat)} alt="" className="mx-auto h-32 object-contain grayscale" />
        <p className="mt-1 font-display text-3xl">{nick}</p>
        <p className="font-semibold">{cause}{role ? ` · era ${role}` : ""}</p>
        <p className="mt-3 rounded-xl border-2 border-ink bg-paper p-2 text-sm">
          {will ? <>Su testamento: <em>"{will}"</em></> : "No dejó testamento."}
        </p>
      </motion.div>
    </motion.div>
  );
}
