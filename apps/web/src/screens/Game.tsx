import { useEffect, useRef, useState } from "react";
import { useGame } from "../state/store.js";
import type { MatchView, PublicPlayer } from "../types.js";
import { Button, Card, Pill } from "../ui/primitives.js";
import { PHASE_LABEL } from "../lib/text.js";
import { ROLE_NAMES, roleName } from "../lib/roles.js";
import { secondsLeft as secondsUntil } from "../lib/countdown.js";
import { trialsLeftToday } from "../lib/trials.js";
import { RoleReveal } from "../game/RoleReveal.js";
import { ActionDock } from "../game/ActionDock.js";
import { Table } from "../game/Table.js";
import { Sheet } from "../game/Sheet.js";
import { voteCommand } from "../lib/quickAction.js";
import { usePhoneLayout } from "../lib/useMediaQuery.js";
import { roleIconUrl } from "../lib/roleImages.js";
import { Plaza } from "../game/Plaza.js";
import { PushButton } from "../game/PushButton.js";
import { TopBar } from "../game/TopBar.js";
import { LiveList, type LiveTab } from "../game/LiveList.js";
import { SideTabs, type SideTab } from "../game/SideTabs.js";
import { SettingsMenu } from "../game/SettingsMenu.js";
import { BottomLeft } from "../game/BottomLeft.js";
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
  const send = useGame((s) => s.send);
  const [targets, setTargets] = useState<string[]>([]);
  const [muted, setMutedState] = useState(isMuted);
  const [sideTab, setSideTab] = useState<SideTab>("role");
  const [liveTab, setLiveTab] = useState<LiveTab>("live");
  const phone = usePhoneLayout();
  const [sheet, setSheet] = useState<"role" | "chat" | null>(null);
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

  // Lo elegido no sobrevive a la fase: un objetivo de día no se arrastra a la votación ni a la noche.
  useEffect(() => setTargets([]), [view.phase, view.dayNumber]);

  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  // Votación: la lista es el voto. Lo marcado es tu voto actual; tocar a alguien lo vota, y tocar al votado lo retira.
  const voting = view.phase === "voting" && view.me.status === "alive";
  const myVote = view.votes[view.me.id] ?? null;
  const selected = voting ? (myVote ? [myVote] : []) : targets;

  /** Con Retributionist, el primer objetivo es un Town muerto (zombi) y el segundo un vivo. */
  const isPickable = (p: PublicPlayer) => {
    if (!need.selectable || p.id === view.me.id) return false;
    if (voting) return p.status === "alive";
    if (!need.raise) return p.status === "alive";
    if (p.status === "alive") return targets.length > 0;
    // Wiki (Retributionist.md:236): no se ofrecen los roles que no se pueden resucitar (lib/resurrect.ts).
    return targets.length === 0 && canBeResurrected(p);
  };

  const pick = (id: string) => {
    if (voting) {
      void send(voteCommand(view, id));
      return;
    }
    setTargets((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      return [...current, id].slice(-need.max);
    });
  };

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
    ? `Hacen falta ${vote.needed} votos. ${vote.leader ? `Más votado: ${vote.leader.nick} (${vote.leader.count}).` : "Nadie tiene votos todavía."}${voting ? " Toca a alguien para votarle; otra vez, para quitar tu voto." : ""}`
    : phaseBanner(view);
  const closeSheet = () => setSheet(null);
  // Avisos a pantalla completa: iguales en móvil y escritorio.
  const overlays = (
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
    </>
  );

  if (phone) {
    // Móvil (vertical y horizontal): la cuadrícula de jugadores es la mesa. Rol y chat, en hojas que se abren desde arriba.
    return (
      <>
        {overlays}
        <main className="phone-main flex min-h-dvh flex-col gap-2 p-3">
          <header className="phone-head flex items-center justify-between gap-2">
            <SettingsMenu muted={muted} onToggleMute={toggleMute} />
            <div className="min-w-0 text-center">
              <p className="font-display text-xl leading-tight">
                {PHASE_LABEL[view.phase]}{left !== null ? ` · ${left} s` : ""}
              </p>
              <p className="text-xs font-semibold">Día {view.dayNumber} · ⚖ {trialsLeft} · Sala {view.roomCode}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" aria-label="Tu rol" onClick={() => setSheet("role")} className="cartoon-btn flex size-10 items-center justify-center px-0 py-0">
                {roleIconUrl(me.roleKey) ? <img src={roleIconUrl(me.roleKey) ?? ""} alt="" className="size-7 object-contain" /> : <span aria-hidden="true">✦</span>}
              </button>
              <button type="button" aria-label="Chat y registro" onClick={() => setSheet("chat")} className="cartoon-btn flex size-10 items-center justify-center px-0 py-0 text-xl">
                <span aria-hidden="true">💬</span>
              </button>
            </div>
          </header>
          <div className="phone-table-wrap flex min-h-0 flex-1 flex-col">
            <Table view={view} selected={selected} isPickable={isPickable} onPick={pick} />
          </div>
          <footer className="phone-foot flex flex-col gap-2">
            {/* La plaza lleva la frase de la fase y el estado: el recuento de votos, el acusado y los muertos. */}
            <div className="phone-plaza">
              <Plaza view={view} log={log} subtitle={subtitle} />
            </div>
            <ActionDock inline view={view} targets={targets} clearTargets={() => setTargets([])} />
          </footer>
        </main>
        {sheet === "role" && (
          <Sheet title={`Tu rol · ${me.nick}`} onClose={closeSheet}>
            <div className="flex h-full min-h-0 flex-col gap-2">
              <PushButton />
              <SideTabs view={view} tab={sideTab} onTab={setSideTab} className="min-h-0 flex-1" />
            </div>
          </Sheet>
        )}
        {sheet === "chat" && (
          <Sheet title="Chat y registro" onClose={closeSheet}>
            <BottomLeft view={view} log={log} className="h-full" />
          </Sheet>
        )}
      </>
    );
  }

  return (
    <>
      {overlays}
      {/* Escritorio, tres zonas. Izquierda: cabecera, pestañas de rol y chat. Centro: la plaza (fase, votos, juicio, muertes).
          Derecha: la lista de jugadores, la única superficie de selección. */}
      <main className="game-grid md:grid">
        <div className="md:flex md:min-h-0 md:flex-col md:gap-2 md:col-start-1 md:row-start-1">
          <Card className="flex items-center justify-between gap-2 p-2">
            <div className="flex min-w-0 items-center gap-2">
              <SettingsMenu muted={muted} onToggleMute={toggleMute} />
              <div className="min-w-0">
                <p className="truncate font-display text-xl">{me.nick}</p>
                <p className="whitespace-nowrap text-xs font-semibold">Sala {view.roomCode}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <PushButton />
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("¿Salir de la partida? No podrás volver a entrar en esta sesión.")) leave();
                }}
                className="cartoon-btn danger px-2 py-1 text-xs"
              >
                Salir
              </button>
            </div>
          </Card>
          <SideTabs view={view} tab={sideTab} onTab={setSideTab} className="md:min-h-0 md:max-h-[55%] md:flex-none" />
          <BottomLeft view={view} log={log} className="md:min-h-0 md:flex-[1_1_0]" />
        </div>

        <div className="md:flex md:min-h-0 md:flex-col md:gap-2 md:col-start-2 md:row-start-1">
          <TopBar
            view={view}
            trialsLeft={trialsLeft}
            secondsLeft={left}
            muted={muted}
            onToggleMute={toggleMute}
          />
          <section className="md:min-h-0 md:flex-1">
            <Plaza view={view} log={log} subtitle={subtitle} />
          </section>
        </div>

        <div className="md:flex md:min-h-0 md:flex-col md:gap-2 md:col-start-3 md:row-start-1">
          <LiveList
            view={view}
            tab={liveTab}
            onTab={setLiveTab}
            className="md:min-h-0 md:flex-1"
            selected={selected}
            isPickable={isPickable}
            onPick={pick}
          />
        </div>

        <ActionDock view={view} targets={targets} clearTargets={() => setTargets([])} />
      </main>
    </>
  );
}
