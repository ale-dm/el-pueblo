import { useEffect, useState } from "react";
import { useGame } from "../state/store.js";
import type { MatchView } from "../types.js";
import { Button, Card, Pill } from "../ui/primitives.js";
import { PHASE_LABEL } from "../lib/text.js";
import { ROLE_NAMES } from "../lib/roles.js";
import { formatClock, secondsLeft } from "../lib/countdown.js";
import { RoleCard } from "../game/RoleCard.js";
import { RoleReveal } from "../game/RoleReveal.js";
import { PlayerGrid } from "../game/PlayerGrid.js";
import { ActionPanel } from "../game/ActionPanel.js";
import { Chat } from "../game/Chat.js";
import { LogPanel } from "../game/LogPanel.js";
import { PushButton } from "../game/PushButton.js";

/** Cuántos objetivos pide la fase actual: votación y noche con dos objetivos. */
function targetsNeeded(view: MatchView): { selectable: boolean; max: number } {
  const me = view.me;
  if (me.status !== "alive") return { selectable: false, max: 0 };
  if (view.phase === "voting") return { selectable: true, max: 1 };
  if (view.phase === "night") {
    const selectable = me.nightAbilities.some((a) => a.target !== "none");
    const twoTargets = me.nightAbilities.some((a) => a.target === "two");
    return { selectable, max: twoTargets ? 2 : 1 };
  }
  if (["day_1", "discussion"].includes(view.phase) && me.dayAbilities.some((a) => a.target === "player")) return { selectable: true, max: 1 };
  return { selectable: false, max: 0 };
}

/** Lo que dice el pueblo en cada fase, como el texto de ToS sobre el juego. */
function phaseBanner(view: MatchView): string {
  const alive = view.players.filter((p) => p.status === "alive" && p.connected).length;
  switch (view.phase) {
    case "day_1": return "Primer día: presentaos. Hoy nadie puede ser juzgado.";
    case "discussion": return "Discusión: hablad, acusad y defendeos antes de votar.";
    case "voting": return `Votación: hacen falta ${Math.ceil(alive / 2)} votos para llevar a alguien a juicio.`;
    case "defense": return "Defensa: el acusado habla. Los demás escuchan.";
    case "judgement": return "Juicio: ¿culpable o inocente?";
    case "last_words": return "Últimas palabras del condenado.";
    case "night": return "Noche: elige tu acción. La Mafia decide a quién atacar.";
    default: return "";
  }
}

/** Reloj que avanza cada cuarto de segundo mientras la fase tenga temporizador. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, [active]);
  return now;
}

/** Roles de la partida con su número, como la lista de roles de ToS. */
function RolesInGame({ roles }: { roles: string[] }) {
  const counts = new Map<string, number>();
  for (const key of roles) counts.set(key, (counts.get(key) ?? 0) + 1);
  return (
    <Card>
      <h3 className="mb-2 font-display text-xl">Roles en la partida</h3>
      <div className="flex flex-wrap gap-2">
        {[...counts].map(([key, n]) => (
          <Pill key={key}>{ROLE_NAMES[key]?.es ?? key}{n > 1 ? ` ×${n}` : ""}</Pill>
        ))}
      </div>
    </Card>
  );
}

export function Game({ view }: { view: MatchView }) {
  const log = useGame((s) => s.log);
  const leave = useGame((s) => s.leave);
  const [targets, setTargets] = useState<string[]>([]);
  const need = targetsNeeded(view);
  const now = useNow(view.phaseEndsAt !== null);
  const left = secondsLeft(view.phaseEndsAt, now);

  const pick = (id: string) =>
    setTargets((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      return [...current, id].slice(-need.max);
    });

  if (view.phase === "ended") {
    const won = view.winner === view.me.faction;
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-5 p-6">
        <Card className="text-center">
          <h1 className="font-display text-5xl">{view.winner === "mafia" ? "¡Gana la Mafia!" : "¡Gana el pueblo!"}</h1>
          <p className="mt-2 text-lg">{won ? "Tu bando ha ganado." : "Esta vez, no."}</p>
        </Card>
        <Card>
          <h2 className="mb-2 font-display text-2xl">Quién era quién</h2>
          <ul className="space-y-1">
            {view.players.map((p) => (
              <li key={p.id}>{p.nick}: <strong>{ROLE_NAMES[p.revealedRoleKey ?? ""]?.es ?? p.revealedRoleKey ?? "—"}</strong></li>
            ))}
          </ul>
        </Card>
        <LogPanel view={view} log={log} />
        <Button onClick={leave}>Volver al inicio</Button>
      </main>
    );
  }

  const night = view.phase === "night";
  return (
    <>
      <RoleReveal view={view} />
      <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-4 p-4 md:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Día {view.dayNumber} · sala {view.roomCode}</p>
            <h1 className="font-display text-4xl drop-shadow-[3px_3px_0_var(--color-ink)]">{PHASE_LABEL[view.phase]}</h1>
          </div>
          <div className="flex items-center gap-3">
            {left !== null && (
              <Pill className="tabular-nums">⏱ {formatClock(left)}</Pill>
            )}
            <Pill>{night ? "🌙 Noche" : "☀️ Día"}</Pill>
            <PushButton />
          </div>
        </header>

        <Card>
          <p className="font-semibold">{phaseBanner(view)}</p>
        </Card>

        <div className="grid gap-4 md:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <PlayerGrid view={view} selected={targets} selectable={need.selectable} onPick={pick} />
            <ActionPanel view={view} targets={targets} clearTargets={() => setTargets([])} />
          </div>
          <div className="space-y-4">
            <RoleCard me={view.me} />
            <Chat view={view} log={log} />
            <LogPanel view={view} log={log} />
            <RolesInGame roles={view.rolesInGame} />
          </div>
        </div>
      </main>
    </>
  );
}
