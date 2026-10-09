import { useEffect } from "react";
import { useGame } from "../state/store.js";
import type { MatchView } from "../types.js";
import { Button, Card, Pill } from "../ui/primitives.js";
import { PushButton } from "../game/PushButton.js";
import { Ring } from "../game/Ring.js";

const MIN_PLAYERS = 10;
const MAX_PLAYERS = 15;

/** Mafia según el número de jugadores (ver setup/limits.ts del motor). */

export function Lobby({ view }: { view: MatchView }) {
  const { startMatch, refresh, busy, error, leave, connected, clearError } = useGame();
  const isHost = view.me.seat === 1;
  const count = view.players.length;


  // Las uniones no generan eventos de partida: se refresca la lista mientras esperamos.
  useEffect(() => {
    const timer = setInterval(() => void refresh(), 2500);
    return () => clearInterval(timer);
  }, [refresh]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-4 p-4 md:p-6">
      {!connected && <p role="status" className="rounded-2xl bg-sunset p-2 text-center font-semibold">Sin conexión. Reconectando…</p>}
      <header className="text-center">
        <p className="font-semibold">Código de sala</p>
        <h1 className="font-display text-6xl tracking-widest drop-shadow-[4px_4px_0_var(--color-ink)]">{view.roomCode}</h1>
        <p className="mt-1">Compártelo con tus amigos. Cuando estéis, el anfitrión reparte los roles.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-[1fr_300px]">
        <Card className="min-h-[22rem]">
          <h2 className="mb-2 font-display text-2xl">El pueblo se reúne</h2>
          <div className="h-[20rem]">
            <Ring view={view} selected={[]} selectable={false} onPick={() => undefined} />
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="mb-2 font-display text-2xl">Jugadores ({count}/{MAX_PLAYERS})</h2>
            <ul className="space-y-2">
              {view.players.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-2xl border-2 border-ink bg-white/60 px-3 py-2">
                  <span className="font-semibold">{p.nick}</span>
                  <span className="flex gap-2">
                    {p.seat === 1 && <Pill>Anfitrión</Pill>}
                    {p.isBot && <Pill>Bot</Pill>}
                    {p.id === view.me.id && <Pill>Tú</Pill>}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 className="mb-2 font-display text-xl">Roles</h2>
            <p className="text-sm">Se reparten al empezar, en secreto. Con 10 a 14 jugadores hay 3 de Mafia; con 15, hay 4. El resto es del pueblo.</p>
          </Card>

          {isHost ? (
            <Button className="w-full" disabled={busy || count < MIN_PLAYERS} onClick={() => void startMatch()}>
              {count < MIN_PLAYERS ? `Faltan ${MIN_PLAYERS - count} para empezar` : "Repartir roles y empezar"}
            </Button>
          ) : (
            <p className="text-center font-semibold">Esperando a que el anfitrión empiece…</p>
          )}

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
