import { useState } from "react";
import { useGame } from "../state/store.js";
import { Button, Card, TextField } from "../ui/primitives.js";

/** Máximo de bots: la sala admite 15 jugadores y el anfitrión ocupa uno. */
const MAX_BOTS = 14;

export function Home() {
  const { createRoom, joinRoom, busy, error, clearError } = useGame();
  const [nick, setNick] = useState("");
  const [code, setCode] = useState("");
  const [bots, setBots] = useState(0);
  const validNick = nick.trim().length > 0 && nick.trim().length <= 24;
  const setBotCount = (value: number) => setBots(Math.min(MAX_BOTS, Math.max(0, value)));

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <header className="text-center">
        <h1 className="font-display text-6xl drop-shadow-[4px_4px_0_var(--color-ink)]">El Pueblo</h1>
        <p className="mt-2 text-lg">Mafia con amigos. Un narrador te cuenta la noche.</p>
      </header>

      <Card className="space-y-3">
        <label className="block font-semibold" htmlFor="nick">Tu nick</label>
        <TextField id="nick" value={nick} maxLength={24} placeholder="Cómo te llamas" onChange={(e) => { setNick(e.target.value); clearError(); }} />
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Bots</p>
            <p className="text-sm">Juegan solos. Sirven para llenar la sala.</p>
          </div>
          <div className="flex items-center gap-2" role="group" aria-label="Número de bots">
            <Button tone="danger" aria-label="Quitar un bot" disabled={bots === 0} onClick={() => setBotCount(bots - 1)}>−</Button>
            <span className="min-w-8 text-center font-display text-2xl" aria-live="polite">{bots}</span>
            <Button aria-label="Añadir un bot" disabled={bots === MAX_BOTS} onClick={() => setBotCount(bots + 1)}>+</Button>
          </div>
        </div>
        <Button className="w-full" disabled={busy || !validNick} onClick={() => void createRoom(nick.trim(), bots)}>
          Crear sala
        </Button>
      </Card>

      <Card className="space-y-3">
        <label className="block font-semibold" htmlFor="code">Código de sala</label>
        <TextField id="code" value={code} maxLength={6} placeholder="ABC123" className="uppercase tracking-widest" onChange={(e) => { setCode(e.target.value); clearError(); }} />
        <Button className="w-full" tone="town" disabled={busy || !validNick || code.trim().length !== 6} onClick={() => void joinRoom(code, nick.trim())}>
          Unirme
        </Button>
      </Card>

      {error && <p role="alert" className="rounded-2xl border-4 border-ink bg-blood p-3 font-semibold text-paper">{error}</p>}
    </main>
  );
}
