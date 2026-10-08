import { useState } from "react";
import { useGame } from "../state/store.js";
import { Button, Card, TextField } from "../ui/primitives.js";

export function Home() {
  const { createRoom, joinRoom, busy, error, clearError } = useGame();
  const [nick, setNick] = useState("");
  const [code, setCode] = useState("");
  const validNick = nick.trim().length > 0 && nick.trim().length <= 24;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <header className="text-center">
        <h1 className="font-display text-6xl drop-shadow-[4px_4px_0_var(--color-ink)]">El Pueblo</h1>
        <p className="mt-2 text-lg">Mafia con amigos. Un narrador te cuenta la noche.</p>
      </header>

      <Card className="space-y-3">
        <label className="block font-semibold" htmlFor="nick">Tu nick</label>
        <TextField id="nick" value={nick} maxLength={24} placeholder="Cómo te llamas" onChange={(e) => { setNick(e.target.value); clearError(); }} />
        <Button className="w-full" disabled={busy || !validNick} onClick={() => void createRoom(nick.trim())}>
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
