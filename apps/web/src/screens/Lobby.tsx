import { useEffect } from "react";
import { useGame } from "../state/store.js";
import type { MatchView } from "../types.js";
import { Button, Card, Pill } from "../ui/primitives.js";
import { PushButton } from "../game/PushButton.js";

const MIN_PLAYERS = 10;

export function Lobby({ view }: { view: MatchView }) {
  const { startMatch, refresh, busy, error, leave } = useGame();
  const isHost = view.me.seat === 1;
  const count = view.players.length;

  // Las uniones no generan eventos de partida: se refresca la lista mientras esperamos.
  useEffect(() => {
    const timer = setInterval(() => void refresh(), 2500);
    return () => clearInterval(timer);
  }, [refresh]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-5 p-6">
      <header className="text-center">
        <p className="font-semibold">Código de sala</p>
        <h1 className="font-display text-6xl tracking-widest drop-shadow-[4px_4px_0_var(--color-ink)]">{view.roomCode}</h1>
        <p className="mt-2">Compártelo con tus amigos</p>
      </header>

      <Card>
        <h2 className="mb-3 font-display text-2xl">Jugadores ({count}/15)</h2>
        <ul className="space-y-2">
          {view.players.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-2xl border-2 border-ink bg-white/60 px-3 py-2">
              <span className="font-semibold">{p.nick}</span>
              <span className="flex gap-2">
                {p.seat === 1 && <Pill>Anfitrión</Pill>}
                {p.id === view.me.id && <Pill>Tú</Pill>}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {isHost ? (
        <Button className="w-full" disabled={busy || count < MIN_PLAYERS} onClick={() => void startMatch()}>
          {count < MIN_PLAYERS ? `Faltan ${MIN_PLAYERS - count} para empezar` : "Repartir roles y empezar"}
        </Button>
      ) : (
        <p className="text-center font-semibold">Esperando a que el anfitrión empiece…</p>
      )}

      {error && <p role="alert" className="rounded-2xl border-4 border-ink bg-blood p-3 font-semibold text-paper">{error}</p>}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <PushButton />
        <Button tone="danger" onClick={leave}>Salir de la sala</Button>
      </div>
    </main>
  );
}
