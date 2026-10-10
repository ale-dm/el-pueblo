import { useEffect, useRef, useState } from "react";
import { useGame } from "../state/store.js";
import type { MatchView, PublicPlayer } from "../types.js";
import { Button, Card, Pill } from "../ui/primitives.js";
import { PHASE_LABEL } from "../lib/text.js";
import { ROLE_NAMES, roleName } from "../lib/roles.js";
import { secondsLeft as secondsUntil } from "../lib/countdown.js";
import { trialsLeftToday } from "../lib/trials.js";
import { RoleReveal } from "../game/RoleReveal.js";
import { PlayerGrid } from "../game/PlayerGrid.js";
import { ActionDock } from "../game/ActionDock.js";
import { PushButton } from "../game/PushButton.js";
import { TopBar } from "../game/TopBar.js";
import { LiveList, type LiveTab } from "../game/LiveList.js";
import { SideTabs, type SideTab } from "../game/SideTabs.js";
import { ActionBar } from "../game/ActionBar.js";
import { SettingsMenu } from "../game/SettingsMenu.js";
import { BottomLeft } from "../game/BottomLeft.js";
import { Graveyard } from "../game/Graveyard.js";
import { RolesInGame } from "../game/RolesInGame.js";
import { ScreenBanner, DeathFx } from "../game/Fx.js";
import { isMuted, playCue, setMuted } from "../lib/sound.js";
import { voteStatus } from "../lib/votes.js";
import { canBeResurrected } from "../lib/resurrect.js";
import type { GameEvent } from "../types.js";

/** Cuántos objetivos pide la fase actual: votación y noche con dos objetivos. `raise`: el primero es un muerto. */
function targetsNeeded(view: MatchView): { selectable: boolean; max: number; raise: boolean } {
  const me = view.me;
  if (view.phase === "voting" && me.status === "alive") return { selectable: true, max: 1, raise: false };
  if (view.phase === "night") {
    const usable = me.nightAbilities.filter((a) => a.target !== "none" && a.usesLeft !== 0);
    return {
      selectable: usable.length > 0,
      max: usable.some((a) => a.target === "two") ? 2 : 1,
      raise: usable.some((a) => a.key === "raise"),
    };
  }
  // Vivos y Médiums muertos eligen objetivo de día (las habilidades de día ya salen filtradas por vida).
  if (["day_1", "discussion"].includes(view.phase) && me.dayAbilities.some((a) => a.target === "player")) {
    return { selectable: true, max: 1, raise: false };
  }
  return { selectable: false, max: 0, raise: false };
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
  const [sideTab, setSideTab] = useState<SideTab>("role");
  const [liveTab, setLiveTab] = useState<LiveTab>("live");
  const [banner, setBanner] = useState<{ text: string; tone: "night" | "day" | "trial" } | null>(null);
  const defendantSeen = useRef<string | null>(null);
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

  // Un acusado nuevo: aviso a pantalla completa, como "X va a juicio" en Town of Salem.
  useEffect(() => {
    const d = view.defendantId;
    if (d && d !== defendantSeen.current) setBanner({ text: `${nickOf(d)} va a juicio por conspiración contra el pueblo`, tone: "trial" });
    defendantSeen.current = d;
  }, [view.defendantId]);

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

  /** Con Retributionist, el primer objetivo es un Town muerto (zombi) y el segundo un vivo. */
  const isPickable = (p: PublicPlayer) => {
    if (!need.selectable || p.id === view.me.id) return false;
    if (!need.raise) return p.status === "alive";
    if (p.status === "alive") return targets.length > 0;
    // Wiki (Retributionist.md:236): no se ofrecen los roles que no se pueden resucitar (lib/resurrect.ts).
    return targets.length === 0 && canBeResurrected(p);
  };

  const noPick = (_p: PublicPlayer) => false;
  const noPickAction = (_id: string) => undefined;

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
              <li key={p.id}>{p.nick}: <strong>{roleName(p.revealedRoleKey) ?? "—"}</strong></li>
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
      {death && <DeathFx nick={nickOf(death.payload.playerId)} role={roleName(death.payload.roleKey)} will={death.payload.will ?? null} />}
      {!connected && <p role="status" className="fixed inset-x-0 top-0 z-50 bg-sunset p-2 text-center font-semibold">Sin conexión con el pueblo. Reconectando…</p>}
      {error && (
        <button type="button" role="alert" onClick={clearError} className="fixed inset-x-3 top-3 z-50 rounded-2xl border-4 border-ink bg-blood p-3 text-left font-semibold text-paper">
          {error} <span className="opacity-80">(toca para cerrar)</span>
        </button>
      )}
      {/* Horizontal en pantallas anchas y apaisado (como el juego original); vertical en móvil. */}
      {/* Escritorio: tres columnas de arriba abajo. Izquierda: cabecera, cementerio y roles, y el chat hasta abajo.
          Centro: la pregunta de la fase y los jugadores como tarjetas. Derecha: la carta del rol y la lista de vivos.
          Móvil: el orden de siempre (order-*). */}
      <main className="game-grid flex min-h-dvh flex-col gap-3 p-3 md:grid">
        <div className="contents md:flex md:min-h-0 md:flex-col md:gap-2 md:col-start-1 md:row-start-1">
          <Card className="short-hide order-1 flex items-center justify-between gap-2 p-2">
            <div className="flex min-w-0 items-center gap-2">
              <SettingsMenu muted={muted} onToggleMute={toggleMute} />
              <div className="min-w-0">
                <p className="truncate font-display text-xl">{me.nick}</p>
                <p className="whitespace-nowrap text-xs font-semibold">Sala {view.roomCode}</p>
              </div>
            </div>
            <PushButton />
          </Card>
          <div className="order-6 hidden gap-2 md:flex md:h-[34%] md:min-h-0">
            <Graveyard view={view} className="min-w-0 flex-1" />
            <RolesInGame roles={view.rolesInGame} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto" />
          </div>
          <BottomLeft view={view} log={log} className="order-8 md:min-h-0 md:flex-1" />
        </div>

        <div className="contents md:flex md:min-h-0 md:flex-col md:gap-2 md:col-start-2 md:row-start-1">
          <TopBar
            view={view}
            trialsLeft={trialsLeft}
            secondsLeft={left}
            subtitle={subtitle}
            muted={muted}
            onToggleMute={toggleMute}
            className="order-3"
          />
          <section className="order-4 md:min-h-0 md:flex-1 md:overflow-y-auto">
            {/* Los objetivos se eligen en la lista lateral: aquí solo se ve quién es quién. */}
            <PlayerGrid view={view} selected={targets} isPickable={noPick} onPick={noPickAction} />
          </section>
        </div>

        <div className="contents md:flex md:min-h-0 md:flex-col md:gap-2 md:col-start-3 md:row-start-1">
          <SideTabs view={view} tab={sideTab} onTab={setSideTab} className="order-2 md:max-h-[36%] md:min-h-0" />
          <LiveList
            view={view}
            tab={liveTab}
            onTab={setLiveTab}
            className="order-5 md:min-h-0 md:flex-1"
            selected={targets}
            isPickable={isPickable}
            onPick={pick}
            footer={
              <ActionBar
                onRole={() => setSideTab("role")}
                onRoles={() => setSideTab("roles")}
                onWill={() => setSideTab("will")}
                onLive={() => setLiveTab("live")}
                onGraveyard={() => setLiveTab("dead")}
              />
            }
          />
        </div>

        <ActionDock view={view} targets={targets} clearTargets={() => setTargets([])} />
      </main>
    </>
  );
}
