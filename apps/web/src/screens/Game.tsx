import { useState } from "react";
import { useGame } from "../state/store.js";
import type { MatchView } from "../types.js";
import { Button, Card, Pill } from "../ui/primitives.js";
import { PHASE_LABEL } from "../lib/text.js";
import { RoleCard } from "../game/RoleCard.js";
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

export function Game({ view }: { view: MatchView }) {
  const log = useGame((s) => s.log);
  const leave = useGame((s) => s.leave);
  const [targets, setTargets] = useState<string[]>([]);
  const need = targetsNeeded(view);

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
              <li key={p.id}>{p.nick}: <strong>{p.revealedRoleKey ?? "—"}</strong></li>
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
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Día {view.dayNumber} · sala {view.roomCode}</p>
          <h1 className="font-display text-4xl drop-shadow-[3px_3px_0_var(--color-ink)]">{PHASE_LABEL[view.phase]}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Pill>{night ? "🌙 Noche" : "☀️ Día"}</Pill>
          <PushButton />
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <PlayerGrid view={view} selected={targets} selectable={need.selectable} onPick={pick} />
          <ActionPanel view={view} targets={targets} clearTargets={() => setTargets([])} />
        </div>
        <div className="space-y-4">
          <RoleCard me={view.me} />
          <Chat view={view} log={log} />
          <LogPanel view={view} log={log} />
        </div>
      </div>
    </main>
  );
}
