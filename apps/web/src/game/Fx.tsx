import { AnimatePresence, motion } from "motion/react";

/** Aviso a pantalla completa que se va solo: cae la noche, amanece, o alguien muere. */
export function ScreenBanner({ text, tone = "night" }: { text: string | null; tone?: "night" | "day" | "death" }) {
  const bg = tone === "night" ? "bg-midnight" : tone === "day" ? "bg-sun" : "bg-ink";
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

/** Muerte: lápida y nombre, con su rol si se revela. */
export function DeathFx({ nick, role, will }: { nick: string; role: string | null; will: string | null }) {
  return (
    <AnimatePresence>
      <motion.div
        key={nick + role}
        role="status"
        aria-live="assertive"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-ink/75 p-6"
      >
        <motion.div initial={{ y: 40, rotate: -4 }} animate={{ y: 0, rotate: 0 }} className="cartoon-card max-w-sm p-6 text-center">
          <p className="text-5xl" aria-hidden="true">🪦</p>
          <p className="mt-2 font-display text-3xl">{nick}</p>
          <p className="font-semibold">ha muerto{role ? ` · era ${role}` : ""}</p>
          {will && <p className="mt-2 text-sm italic">"{will}"</p>}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
