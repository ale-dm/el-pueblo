import { useEffect, useRef, useState } from "react";
import { useGame } from "../state/store.js";
import type { MatchView } from "../types.js";
import { Button, Card, Pill, TextField } from "../ui/primitives.js";
import { PushButton } from "../game/PushButton.js";
import { Ring } from "../game/Ring.js";
import { secondsLeft } from "../lib/countdown.js";

const MIN_PLAYERS = 10;
const MAX_PLAYERS = 15;
const MAX_NAME = 16;

/** Mafia según el número de jugadores (ver setup/limits.ts del motor). */

export function Lobby({ view }: { view: MatchView }) {
  const { startMatch, beginNaming, chooseName, refresh, busy, error, leave, connected, clearError } = useGame();
  const isHost = view.me.seat === 1;
  const count = view.players.length;
  const naming = view.namingEndsAt !== null;

  // Las uniones no generan eventos de partida: se refresca la lista mientras esperamos.
  useEffect(() => {
    const timer = setInterval(() => void refresh(), 2500);
    return () => clearInterval(timer);
  }, [refresh]);

  // Avisos de la sala (wiki: Name): quien entra, y quien pone o cambia su nombre. Se calculan entre refrescos.
  const notes = useNotes(view);

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-4 p-4 md:p-6">
      {!connected && <p role="status" className="rounded-2xl bg-sunset p-2 text-center font-semibold">Sin conexión. Reconectando…</p>}
      <header className="text-center">
        <p className="font-semibold">Código de sala</p>
        <h1 className="font-display text-6xl tracking-widest drop-shadow-[4px_4px_0_var(--color-ink)]">{view.roomCode}</h1>
        <p className="mt-1">Compártelo con tus amigos. Cuando estéis, el anfitrión reparte los roles.</p>
      </header>

      {/* Mientras se eligen nombres, lo primero es escribir el tuyo y ver la cuenta atrás. */}
      {naming && <NamingPanel view={view} isHost={isHost} busy={busy} onStart={() => void startMatch()} onChoose={(nick) => void chooseName(nick)} />}

      <div className="grid gap-4 md:grid-cols-[1fr_300px]">
        <Card className="min-h-[22rem]">
          <h2 className="mb-2 font-display text-2xl">El pueblo se reúne</h2>
          <div className="h-[20rem]">
            <Ring view={view} selected={[]} isPickable={() => false} onPick={() => undefined} />
          </div>
        </Card>

        <div className="space-y-4">
          {!naming && (
            <Card>
              <h2 className="mb-2 font-display text-2xl">Jugadores ({count}/{MAX_PLAYERS})</h2>
              <PlayerList view={view} />
            </Card>
          )}
          {notes.length > 0 && (
            <Card className="p-3">
              <h2 className="mb-1 font-display text-lg">Novedades</h2>
              <ul className="space-y-1 text-sm">
                {notes.map((n) => <li key={n.key}>• {n.text}</li>)}
              </ul>
            </Card>
          )}

          <Card>
            <h2 className="mb-2 font-display text-xl">Roles</h2>
            <p className="text-sm">Se reparten al empezar, en secreto. Con 10 a 14 jugadores hay 3 de Mafia; con 15, hay 4. El resto es del pueblo.</p>
          </Card>

          {isHost && !naming && (
            <Button className="w-full" disabled={busy || count < MIN_PLAYERS} onClick={() => void beginNaming()}>
              {count < MIN_PLAYERS ? `Faltan ${MIN_PLAYERS - count} para empezar` : "Elegir nombres y empezar"}
            </Button>
          )}
          {!isHost && !naming && <p className="text-center font-semibold">Esperando a que el anfitrión empiece…</p>}

          {error && (
            <button type="button" role="alert" onClick={clearError} className="w-full rounded-2xl border-4 border-ink bg-blood p-3 text-left font-semibold text-paper">
              {error}
            </button>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <PushButton />
            <Button tone="danger" onClick={leave}>Salir de la sala</Button>
          </div>
        </div>
      </div>
    </main>
  );
}

function PlayerList({ view }: { view: MatchView }) {
  return (
    <ul className="space-y-2">
      {view.players.map((p) => (
        <li key={p.id} className="flex items-center justify-between rounded-2xl border-2 border-ink bg-white/60 px-3 py-2">
          <span className="font-semibold">{p.nick || "(sin elegir)"}</span>
          <span className="flex gap-2">
            {p.seat === 1 && <Pill>Anfitrión</Pill>}
            {p.isBot && <Pill>Bot</Pill>}
            {p.id === view.me.id && <Pill>Tú</Pill>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Elección de nombre antes de repartir (wiki: Name). La cuenta atrás es la de la sala; sin nombre a tiempo, uno por defecto. */
function NamingPanel({ view, isHost, busy, onStart, onChoose }: { view: MatchView; isHost: boolean; busy: boolean; onStart: () => void; onChoose: (nick: string) => void }) {
  const now = useNow();
  const left = secondsLeft(view.namingEndsAt, now) ?? 0;
  const [name, setName] = useState("");
  const chosen = view.me.nick.trim() !== "";
  return (
    <Card>
      {/* En horizontal, el formulario a la izquierda y la lista de jugadores a la derecha. */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="font-display text-2xl">Elige tu nombre</h2>
          <p className="text-sm">
            Quedan <strong>{left} s</strong>. Si no eliges, te tocará un nombre por defecto de los juicios de Salem.
          </p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) onChoose(name);
            }}
          >
            <TextField id="name" aria-label="Tu nombre en la partida" value={name} maxLength={MAX_NAME} placeholder="Solo letras, hasta 16" onChange={(e) => setName(e.target.value)} />
            <Button type="submit" disabled={busy || name.trim() === "" || left === 0}>{chosen ? "Cambiar" : "Guardar"}</Button>
          </form>
          {chosen && <p className="text-sm">Tu nombre en la partida: <strong>{view.me.nick}</strong></p>}
          {isHost && <Button className="w-full" disabled={busy} onClick={onStart}>Empezar ya</Button>}
        </div>
        <PlayerList view={view} />
      </div>
    </Card>
  );
}

/** Reloj que avanza cada cuarto de segundo mientras dura la elección. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, []);
  return now;
}

interface Note {
  key: number;
  text: string;
}

/**
 * Avisos de la sala de espera: "X ha entrado en la sala" y "X se ha unido al pueblo" cuando alguien pone o cambia su
 * nombre (wiki: Name). No vienen del servidor: se deducen de dos vistas seguidas. La primera vista no avisa.
 */
function useNotes(view: MatchView): Note[] {
  const previous = useRef<Map<string, string> | null>(null);
  const counter = useRef(0);
  const [notes, setNotes] = useState<Note[]>([]);
  useEffect(() => {
    const before = previous.current;
    const now = new Map(view.players.map((p) => [p.id, p.nick]));
    previous.current = now;
    if (!before) return;
    const fresh: Note[] = [];
    for (const p of view.players) {
      const old = before.get(p.id);
      if (old === undefined) fresh.push({ key: counter.current++, text: `${p.nick || "Alguien"} ha entrado en la sala` });
      else if (p.nick && p.nick !== old) fresh.push({ key: counter.current++, text: `${p.nick} se ha unido al pueblo` });
    }
    if (fresh.length > 0) setNotes((list) => [...fresh, ...list].slice(0, 4));
  }, [view.players]);
  return notes;
}
