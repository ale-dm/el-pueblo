import type { MatchView } from "../types.js";
import { Pill } from "../ui/primitives.js";
import { PHASE_LABEL } from "../lib/text.js";
import { formatClock } from "../lib/countdown.js";

/** Lo que el pueblo pregunta en cada fase, como en el título de Town of Salem. */
export const PHASE_PROMPT: Record<MatchView["phase"], string> = {
  day_1: "Primer día: presentaos",
  discussion: "Hablad antes de votar",
  voting: "¿A quién llevamos a juicio?",
  defense: "¿Cuál es tu defensa?",
  judgement: "¿Culpable o inocente?",
  last_words: "Últimas palabras",
  night: "Elige tu objetivo esta noche",
  ended: PHASE_LABEL.ended,
};

interface Props {
  view: MatchView;
  trialsLeft: number;
  secondsLeft: number | null;
  /** Qué está pasando ahora, en una frase. */
  subtitle: string;
  muted?: boolean;
  onToggleMute?: () => void;
  className?: string;
}

/** Barra superior: día, juicios que quedan, reloj y la pregunta de la fase. */
export function TopBar({ view, trialsLeft, secondsLeft, subtitle, muted = false, onToggleMute, className = "" }: Props) {
  const night = view.phase === "night";
  return (
    <header className={`flex flex-col items-center gap-1 text-center ${className}`}>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Pill className="bg-paper">Día {view.dayNumber}</Pill>
        <Pill className="bg-paper">⚖ {trialsLeft}</Pill>
        {secondsLeft !== null && <Pill className="tabular-nums bg-paper">⏱ {formatClock(secondsLeft)}</Pill>}
        <Pill className="bg-paper">{night ? "🌙 Noche" : "☀️ Día"}</Pill>
        {onToggleMute && (
          <button type="button" onClick={onToggleMute} aria-pressed={muted} aria-label={muted ? "Activar sonidos" : "Silenciar sonidos"} className="cartoon-btn px-2 py-0 text-sm">
            {muted ? "🔇" : "🔊"}
          </button>
        )}
      </div>
      <h1 className="short-title font-display text-3xl drop-shadow-[3px_3px_0_var(--color-ink)] md:text-3xl">{PHASE_PROMPT[view.phase]}</h1>
      <p className="short-hide text-sm font-semibold">{subtitle}</p>
    </header>
  );
}
