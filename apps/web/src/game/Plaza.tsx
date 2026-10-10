import type { GameEvent, MatchView } from "../types.js";
import { PHASE_PROMPT } from "./TopBar.js";
import { roleName } from "../lib/roles.js";

interface Props {
  view: MatchView;
  log: GameEvent[];
  /** Qué está pasando ahora, en una frase (votos necesarios, más votado, o el aviso de la fase). */
  subtitle: string;
}

/**
 * La plaza: el centro del pueblo. Muestra lo que pasa ahora: el recuento de votos, el acusado en juicio y quién ha
 * muerto por la mañana. No repite la lista de jugadores; la selección y el estado están a la derecha.
 */
export function Plaza({ view, log, subtitle }: Props) {
  const nick = (id: string | null | undefined) => view.players.find((p) => p.id === id)?.nick ?? "?";
  const alive = view.players.filter((p) => p.status === "alive");
  // Mismo umbral que el aviso de votación: la mitad de los vivos y conectados, redondeada hacia arriba.
  const need = Math.max(1, Math.ceil(view.players.filter((p) => p.status === "alive" && p.connected).length / 2));
  const tally = alive
    .map((p) => ({ p, votes: Object.values(view.votes).filter((t) => t === p.id).length }))
    .filter((c) => c.votes > 0)
    .sort((a, b) => b.votes - a.votes);
  const verdicts = Object.values(view.verdicts);
  const guilty = verdicts.filter((v) => v === "guilty").length;
  const innocent = verdicts.filter((v) => v === "innocent").length;

  // Muertes de la última noche: los eventos de muerte posteriores al último inicio de noche.
  let lastNight = -1;
  log.forEach((e, i) => {
    if (e.type === "phase.started" && e.payload.phase === "night") lastNight = i;
  });
  const deaths = log
    .slice(lastNight + 1)
    .flatMap((e) => (e.type === "player.killed" || e.type === "player.hanged" ? [e.payload] : []));

  return (
    <section aria-label="La plaza" className="flex h-full min-h-0 flex-col items-center gap-3 overflow-y-auto rounded-3xl border-4 border-ink bg-paper/60 p-4 text-center">
      <h1 className="font-display text-2xl leading-tight md:text-xl">{PHASE_PROMPT[view.phase]}</h1>
      <p className="text-sm font-semibold">{subtitle}</p>
      {view.phase !== "ended" && (
        <p className="text-xs opacity-80">
          Vivos: {alive.length} · Muertos: {view.players.length - alive.length}
        </p>
      )}

      {view.phase !== "night" && deaths.length > 0 && (
        <div className="rounded-xl border-4 border-ink bg-ink px-3 py-1 text-sm font-semibold text-paper">
          ✝ {deaths.map((d) => `${nick(d.playerId)}${d.roleKey ? ` (${roleName(d.roleKey)})` : ""}`).join(", ")}
        </div>
      )}

      {view.phase === "voting" && (
        <div className="w-full max-w-md space-y-2 text-left">
          {tally.length === 0 && <p className="text-center text-sm">Nadie tiene votos todavía.</p>}
          {tally.map(({ p, votes }) => {
            const reached = votes >= need;
            return (
              <div key={p.id}>
                <div className="flex justify-between text-sm font-semibold">
                  <span className="truncate">{p.nick}</span>
                  <span>{votes} / {need}</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full border-2 border-ink bg-white">
                  <div className={`h-full ${reached ? "bg-blood" : "bg-sun"}`} style={{ width: `${Math.min(100, (votes / need) * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(view.phase === "defense" || view.phase === "judgement" || view.phase === "last_words") && view.defendantId && (
        <div className="space-y-2">
          <p className="font-display text-3xl">{nick(view.defendantId)}</p>
          {view.phase === "judgement" && (
            <p className="text-sm font-semibold">
              Culpable: {guilty} · Inocente: {innocent}
            </p>
          )}
        </div>
      )}

      {view.phase === "ended" && view.winner && (
        <p className="font-display text-3xl">{view.winner === "mafia" ? "Gana la Mafia" : "Gana el pueblo"}</p>
      )}
    </section>
  );
}
