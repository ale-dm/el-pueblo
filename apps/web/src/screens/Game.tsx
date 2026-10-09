import { useEffect, useState } from "react";
import { useGame } from "../state/store.js";
import type { MatchView } from "../types.js";
import { Button, Card, Pill } from "../ui/primitives.js";
import { PHASE_LABEL } from "../lib/text.js";
import { ROLE_NAMES } from "../lib/roles.js";
import { secondsLeft as secondsUntil } from "../lib/countdown.js";
import { trialsLeftToday } from "../lib/trials.js";
import { RoleReveal } from "../game/RoleReveal.js";
import { PlayerGrid } from "../game/PlayerGrid.js";
import { Ring } from "../game/Ring.js";
import { ActionPanel } from "../game/ActionPanel.js";
import { PushButton } from "../game/PushButton.js";
import { TopBar } from "../game/TopBar.js";
import { LiveList } from "../game/LiveList.js";
import { SideTabs } from "../game/SideTabs.js";
import { BottomLeft } from "../game/BottomLeft.js";

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

export function Game({ view }: { view: MatchView }) {
  const log = useGame((s) => s.log);
  const leave = useGame((s) => s.leave);
  const [targets, setTargets] = useState<string[]>([]);
  const need = targetsNeeded(view);
  const now = useNow(view.phaseEndsAt !== null);
  const left = secondsUntil(view.phaseEndsAt, now);

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
        <Card>
          <h2 className="mb-2 font-display text-2xl">Registro</h2>
          <BottomLeft view={view} log={log} />
        </Card>
        <Button onClick={leave}>Volver al inicio</Button>
      </main>
    );
  }

  const trialsLeft = trialsLeftToday(log);
  const me = view.me;
  return (
    <>
      <RoleReveal view={view} />
      {/* Horizontal en pantallas anchas y apaisado (como el juego original); vertical en móvil. */}
      <main className="game-grid flex min-h-dvh flex-col gap-3 p-3 md:grid">
        <aside className="flex min-h-0 flex-col gap-2 md:col-start-1 md:row-span-2 md:row-start-1">
          <Card className="short-hide flex items-center justify-between gap-2 p-3">
            <div className="min-w-0">
              <p className="truncate font-display text-2xl">{me.nick}</p>
              <p className="text-xs font-semibold">Sala {view.roomCode}</p>
            </div>
            <PushButton />
          </Card>
          <SideTabs view={view} className="md:min-h-0 md:flex-1" />
        </aside>

        <TopBar
          view={view}
          trialsLeft={trialsLeft}
          secondsLeft={left}
          subtitle={phaseBanner(view)}
          className="md:col-start-2 md:row-start-1"
        />

        <section className="md:col-start-2 md:row-start-2 md:min-h-0">
          <div className="md:hidden">
            <PlayerGrid view={view} selected={targets} selectable={need.selectable} onPick={pick} />
          </div>
          <div className="hidden h-full md:block">
            <Ring view={view} selected={targets} selectable={need.selectable} onPick={pick} />
          </div>
        </section>

        <ActionPanel view={view} targets={targets} clearTargets={() => setTargets([])} className="md:col-start-2 md:row-start-3 md:self-start" />

        <LiveList view={view} className="md:col-start-3 md:row-span-3 md:row-start-1 md:min-h-0" />

        <BottomLeft view={view} log={log} className="md:col-start-1 md:row-start-3 md:max-h-[14rem]" />
      </main>
    </>
  );
}
