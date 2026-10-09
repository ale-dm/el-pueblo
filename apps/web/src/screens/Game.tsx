import { useEffect, useRef, useState } from "react";
import { useGame } from "../state/store.js";
import type { MatchView } from "../types.js";
import { Button, Card, Pill } from "../ui/primitives.js";
import { PHASE_LABEL } from "../lib/text.js";
import { ROLE_NAMES, roleNameEs } from "../lib/roles.js";
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
import { ScreenBanner, DeathFx } from "../game/Fx.js";
import { isMuted, playCue, setMuted } from "../lib/sound.js";
import { voteStatus } from "../lib/votes.js";
import type { GameEvent } from "../types.js";

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
  const error = useGame((s) => s.error);
  const connected = useGame((s) => s.connected);
  const clearError = useGame((s) => s.clearError);
  const [targets, setTargets] = useState<string[]>([]);
  const [muted, setMutedState] = useState(isMuted);
  const [banner, setBanner] = useState<{ text: string; tone: "night" | "day" } | null>(null);
  const [death, setDeath] = useState<GameEvent | null>(null);
  const seen = useRef<number | null>(null);
  const prevNight = useRef<boolean | null>(null);
  const need = targetsNeeded(view);
  const now = useNow(view.phaseEndsAt !== null);
  const left = secondsUntil(view.phaseEndsAt, now);
  const nickOf = (id: string) => view.players.find((p) => p.id === id)?.nick ?? "?";

  // Eventos nuevos desde que se abrió la pantalla: sonidos y muertes. Lo anterior no se repite.
  useEffect(() => {
    const last = log.at(-1)?.seq ?? 0;
    if (seen.current === null) {
      seen.current = last;
      return;
    }
    const fresh = log.filter((e) => e.seq > (seen.current ?? 0));
    seen.current = last;
    if (fresh.some((e) => e.type === "vote.cast")) playCue("vote");
    for (const e of fresh) {
      if (e.type === "phase.started") playCue(e.payload.phase === "night" ? "night" : "phase");
      if (e.type === "player.killed" || e.type === "player.hanged") {
        playCue("death");
        setDeath(e);
      }
    }
  }, [log]);

  // Cambio de día y noche: un aviso a pantalla completa.
  useEffect(() => {
    const night = view.phase === "night";
    if (prevNight.current !== null && prevNight.current !== night) {
      setBanner({ text: night ? "Cae la noche…" : "Amanece…", tone: night ? "night" : "day" });
    }
    prevNight.current = night;
  }, [view.phase]);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 1800);
    return () => clearTimeout(timer);
  }, [banner]);

  useEffect(() => {
    if (!death) return;
    const timer = setTimeout(() => setDeath(null), 2800);
    return () => clearTimeout(timer);
  }, [death]);

  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  const pick = (id: string) =>
    setTargets((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      return [...current, id].slice(-need.max);
    });

  if (view.phase === "ended") {
    const won = view.winner === view.me.faction;
    const wills = log.filter((e) => (e.type === "player.killed" || e.type === "player.hanged") && e.payload.will);
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
          <h2 className="mb-2 font-display text-2xl">Testamentos</h2>
          {wills.length === 0 && <p>Nadie dejó testamento.</p>}
          <ul className="space-y-2">
            {wills.map((e) => (
              <li key={e.seq}><strong>{nickOf(e.payload.playerId)}:</strong> "{e.payload.will}"</li>
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
  const vote = voteStatus(view);
  const subtitle = view.phase === "voting"
    ? `Hacen falta ${vote.needed} votos. ${vote.leader ? `Más votado: ${vote.leader.nick} (${vote.leader.count}).` : "Nadie tiene votos todavía."}`
    : phaseBanner(view);
  return (
    <>
      <RoleReveal view={view} />
      <ScreenBanner text={banner?.text ?? null} tone={banner?.tone} />
      {death && <DeathFx nick={nickOf(death.payload.playerId)} role={roleNameEs(death.payload.roleKey)} will={death.payload.will ?? null} />}
      {!connected && <p role="status" className="fixed inset-x-0 top-0 z-50 bg-sunset p-2 text-center font-semibold">Sin conexión con el pueblo. Reconectando…</p>}
      {error && (
        <button type="button" role="alert" onClick={clearError} className="fixed inset-x-3 top-3 z-50 rounded-2xl border-4 border-ink bg-blood p-3 text-left font-semibold text-paper">
          {error} <span className="opacity-80">(toca para cerrar)</span>
        </button>
      )}
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
          subtitle={subtitle}
          muted={muted}
          onToggleMute={toggleMute}
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
