import type { ReactElement } from "react";
import { useGame } from "../state/store.js";
import type { MatchView } from "../types.js";
import { Button, Card } from "../ui/primitives.js";
import { abilityLabel } from "../lib/text.js";

const DAY_PHASES = ["day_1", "discussion", "voting"];

/** Acciones disponibles según la fase, el rol y los usos restantes. Los objetivos llegan desde el tablero. */
export function ActionPanel({ view, targets, clearTargets }: { view: MatchView; targets: string[]; clearTargets: () => void }) {
  const send = useGame((s) => s.send);
  const busy = useGame((s) => s.busy);
  const me = view.me;
  const target = targets[0] ?? null;
  const dispatch = async (command: Record<string, unknown>) => {
    await send(command);
    clearTargets();
  };

  if (view.phase === "ended") return null;
  if (me.status !== "alive") {
    return <Card><p>Estás muerto. Puedes seguir la partida y hablar en Ultratumba.</p></Card>;
  }

  const actions: ReactElement[] = [];

  if (view.phase === "voting") {
    actions.push(
      <Button key="vote" tone="danger" disabled={busy || !target} onClick={() => dispatch({ type: "vote", voterId: me.id, targetId: target })}>
        Votar {target ? `a ${view.players.find((p) => p.id === target)?.nick}` : "(elige en el tablero)"}
      </Button>,
      <Button key="abstain" disabled={busy} onClick={() => dispatch({ type: "vote", voterId: me.id, targetId: null })}>
        Abstenerme
      </Button>,
    );
  }

  if (view.phase === "judgement" && view.defendantId !== me.id) {
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
    for (const ab of me.nightAbilities) {
      if (ab.usesLeft === 0) continue;
      const label = `${abilityLabel(ab.key)}${ab.usesLeft !== null ? ` (${ab.usesLeft})` : ""}`;
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
      if (ab.target === "none") {
        actions.push(<Button key={ab.key} disabled={busy} onClick={() => dispatch({ type: "day.action", actorId: me.id, ability: ab.key, targetId: null })}>{abilityLabel(ab.key)}</Button>);
      } else {
        actions.push(<Button key={ab.key} disabled={busy || !target} onClick={() => dispatch({ type: "day.action", actorId: me.id, ability: ab.key, targetId: target })}>{abilityLabel(ab.key)}</Button>);
      }
    }
  }

  const hint = view.phase === "night" && me.nightAction ? "Tu acción de esta noche está elegida. Puedes cambiarla." : null;

  return (
    <Card>
      <h3 className="mb-2 font-display text-xl">Tus acciones</h3>
      {actions.length ? <div className="flex flex-wrap gap-2">{actions}</div> : <p className="text-sm">No tienes nada que hacer ahora.</p>}
      {hint && <p className="mt-2 text-sm">{hint}</p>}
    </Card>
  );
}
