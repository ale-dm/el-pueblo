import type { ReactElement } from "react";
import { useGame } from "../state/store.js";
import type { MatchView } from "../types.js";
import { Button, Card } from "../ui/primitives.js";
import { abilityLabel } from "../lib/text.js";

const DAY_PHASES = ["day_1", "discussion", "voting"];

/** Texto de un uso restante, como en ToS: "te quedan 2". */
const usesText = (n: number | null) => (n === null ? "" : ` (te quedan ${n})`);

/** Acciones disponibles según la fase, el rol y los usos restantes. Los objetivos llegan desde el tablero. */
export function ActionPanel({ view, targets, clearTargets }: { view: MatchView; targets: string[]; clearTargets: () => void }) {
  const send = useGame((s) => s.send);
  const busy = useGame((s) => s.busy);
  const me = view.me;
  const target = targets[0] ?? null;
  const nick = (id: string | null | undefined) => (id ? view.players.find((p) => p.id === id)?.nick ?? "?" : "");
  const dispatch = async (command: Record<string, unknown>) => {
    await send(command);
    clearTargets();
  };

  if (view.phase === "ended") return null;
  if (me.status !== "alive") {
    return <Card><p>Estás muerto. Puedes seguir la partida y hablar en Ultratumba.</p></Card>;
  }

  const actions: ReactElement[] = [];
  let status: string | null = null;

  if (view.phase === "voting") {
    const myVote = view.votes[me.id];
    status = myVote === undefined ? "Aún no has votado." : myVote === null ? "Te has abstenido." : `Tu voto: ${nick(myVote)}.`;
    actions.push(
      <Button key="vote" tone="danger" disabled={busy || !target} onClick={() => dispatch({ type: "vote", voterId: me.id, targetId: target })}>
        Votar {target ? `a ${nick(target)}` : "(elige en el tablero)"}
      </Button>,
      <Button key="abstain" disabled={busy} onClick={() => dispatch({ type: "vote", voterId: me.id, targetId: null })}>
        Abstenerme
      </Button>,
    );
  }

  if (view.phase === "judgement" && view.defendantId !== me.id) {
    const verdict = view.verdicts[me.id];
    status = verdict ? `Has votado ${verdict === "guilty" ? "culpable" : "inocente"}.` : "Aún no has votado en el juicio.";
    actions.push(
      <Button key="guilty" tone="danger" disabled={busy} onClick={() => dispatch({ type: "judgement.vote", voterId: me.id, verdict: "guilty" })}>
        Culpable
      </Button>,
      <Button key="innocent" tone="town" disabled={busy} onClick={() => dispatch({ type: "judgement.vote", voterId: me.id, verdict: "innocent" })}>
        Inocente
      </Button>,
    );
  }

  if (view.phase === "night") {
    status = me.nightAction
      ? `Has decidido ${abilityLabel(me.nightAction.ability)}${me.nightAction.targetId ? ` a ${nick(me.nightAction.targetId)}` : ""} esta noche.`
      : me.nightAbilities.length ? "Aún no has elegido acción esta noche." : "Esta noche no tienes nada que hacer.";
    for (const ab of me.nightAbilities) {
      if (ab.usesLeft === 0) continue;
      const label = `${abilityLabel(ab.key)}${usesText(ab.usesLeft)}`;
      if (ab.target === "none") {
        actions.push(<Button key={ab.key} disabled={busy} onClick={() => dispatch({ type: "night.action", actorId: me.id, ability: ab.key, targetId: null })}>{label}</Button>);
      } else if (ab.target === "player") {
        actions.push(<Button key={ab.key} disabled={busy || !target} onClick={() => dispatch({ type: "night.action", actorId: me.id, ability: ab.key, targetId: target })}>{label}</Button>);
      } else {
        const second = targets[1] ?? null;
        actions.push(<Button key={ab.key} disabled={busy || !target || !second} onClick={() => dispatch({ type: "night.action", actorId: me.id, ability: ab.key, targetId: target, secondTargetId: second })}>{label}</Button>);
      }
    }
  }

  if (DAY_PHASES.includes(view.phase)) {
    for (const ab of me.dayAbilities) {
      if (ab.usesLeft === 0) continue;
      const label = `${abilityLabel(ab.key)}${usesText(ab.usesLeft)}`;
      if (ab.target === "none") {
        actions.push(<Button key={ab.key} disabled={busy} onClick={() => dispatch({ type: "day.action", actorId: me.id, ability: ab.key, targetId: null })}>{label}</Button>);
      } else {
        actions.push(<Button key={ab.key} disabled={busy || !target} onClick={() => dispatch({ type: "day.action", actorId: me.id, ability: ab.key, targetId: target })}>{label}</Button>);
      }
    }
  }

  return (
    <Card>
      <h3 className="mb-2 font-display text-xl">Tus acciones</h3>
      {status && <p className="mb-3 font-semibold">{status}</p>}
      {actions.length ? <div className="flex flex-wrap gap-2">{actions}</div> : <p className="text-sm">No tienes nada que hacer ahora.</p>}
      {view.phase === "night" && me.nightAction && <p className="mt-2 text-sm">Puedes cambiar tu elección hasta que acabe la noche.</p>}
    </Card>
  );
}
