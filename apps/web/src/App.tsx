import { useEffect } from "react";
import { useGame } from "./state/store.js";
import { Home } from "./screens/Home.js";
import { Lobby } from "./screens/Lobby.js";
import { Game } from "./screens/Game.js";
import { isNight } from "./lib/text.js";

export function App() {
  const { session, view, init, connected, error } = useGame();
  useEffect(() => init(), [init]);

  useEffect(() => {
    document.body.classList.toggle("night", view ? isNight(view.phase) : false);
  }, [view]);

  if (!session) return <Home />;
  if (!view) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <p className="font-display text-2xl">{connected ? "Entrando a la sala…" : "Conectando con el pueblo…"}</p>
        {error && <p role="alert" className="ml-4 font-semibold text-blood">{error}</p>}
      </main>
    );
  }
  if (view.status === "lobby") return <Lobby view={view} />;
  return <Game view={view} />;
}
