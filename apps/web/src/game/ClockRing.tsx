import { useRef } from "react";
import { clockFraction } from "../lib/clock.js";
import { formatClock } from "../lib/countdown.js";

/**
 * Temporizador de la fase: un anillo que se vacía y el tiempo dentro. Como el reloj no sabe cuánto dura la fase, el
 * anillo toma como total el mayor tiempo visto en esa misma fase.
 */
export function ClockRing({ seconds, phaseKey, size = 44 }: { seconds: number; phaseKey: string; size?: number }) {
  const seen = useRef({ key: phaseKey, max: seconds });
  if (seen.current.key !== phaseKey) seen.current = { key: phaseKey, max: seconds };
  else if (seconds > seen.current.max) seen.current.max = seconds;

  const r = 22;
  const length = 2 * Math.PI * r;
  const fraction = clockFraction(seconds, seen.current.max);
  return (
    <div role="timer" aria-label={`${seconds} segundos`} className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 56 56" aria-hidden="true" className="absolute inset-0 size-full -rotate-90">
        <circle cx="28" cy="28" r={r} fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="6" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke={seconds <= 10 ? "var(--color-blood)" : "var(--color-sun)"}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={length * (1 - fraction)}
        />
      </svg>
      <span className={`relative font-display leading-none tabular-nums ${seconds >= 60 ? "text-[10px]" : "text-sm"}`}>{formatClock(seconds)}</span>
    </div>
  );
}
