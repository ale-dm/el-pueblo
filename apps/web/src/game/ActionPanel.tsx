import { useState, type ReactElement } from "react";
import { useGame } from "../state/store.js";
import type { MatchView } from "../types.js";
import { Button, Card } from "../ui/primitives.js";
import { CHOICE_LABEL, abilityLabel } from "../lib/text.js";
import { ROLE_NAMES } from "../lib/roles.js";

const DAY_PHASES = ["day_1", "discussion", "voting"];

/** Nota de muerte: hasta 400 caracteres (wiki: Death_Note_ToS.md:15). Debe coincidir con el motor. */
const MAX_DEATH_NOTE = 400;

/** Texto de un uso restante, como en ToS: "te quedan 2". */
const usesText = (n: number | null) => (n === null ? "" : ` (te quedan ${n})`);

/** Nombre de una opción: mensajes en español, roles en inglés. */
const choiceText = (c: string) => CHOICE_LABEL[c] ?? ROLE_NAMES[c] ?? c;

/** Acciones disponibles según la fase, el rol y los usos restantes. Los objetivos llegan desde el tablero. */
export function ActionPanel({ view, targets, clearTargets, className = "" }: { view: MatchView; targets: string[]; clearTargets: () => void; className?: string }) {
  const send = useGame((s) => s.send);
  const busy = useGame((s) => s.busy);
  // Elección de cada habilidad (mensaje del Hypnotist, rol del Forger), por clave de habilidad.
  const [choices, setChoices] = useState<Record<string, string>>({});
  // Nota de muerte de cada habilidad que mata (wiki: Death_Note_ToS.md:15, hasta 400 caracteres).
  const [notes, setNotes] = useState<Record<string, string>>({});
  const me = view.me;
  const alive = me.status === "alive";
  const target = targets[0] ?? null;
  const second = targets[1] ?? null;
  const nick = (id: string | null | undefined) => (id ? view.players.find((p) => p.id === id)?.nick ?? "?" : "");
  const dispatch = async (command: Record<string, unknown>) => {
    await send(command);
    clearTargets();
  };

  if (view.phase === "ended") return null;
  // Un muerto solo actúa si tiene habilidades de muerto (Medium): de noche, o de día para abrir su sesión (wiki: Medium.md:203).
  const ghostActions = !alive && (view.phase === "night" ? me.nightAbilities.length > 0 : DAY_PHASES.includes(view.phase) && me.dayAbilities.length > 0);
  if (!alive && !ghostActions) {
    return (
      <Card>
        <h3 className="mb-1 font-display text-xl">Eres un fantasma</h3>
        <p className="text-sm">Ves la partida y puedes hablar en Ultratumba. Ya no votas ni actúas.</p>
      </Card>
    );
  }

  const actions: ReactElement[] = [];
  let status: string | null = null;

  if (alive && view.phase === "voting") {
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

  if (alive && view.phase === "judgement" && view.defendantId !== me.id) {
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
    if (me.nightAction) {
      actions.push(
        <Button key="cancel" tone="danger" disabled={busy} onClick={() => dispatch({ type: "night.action.cancel", actorId: me.id })}>
          Cancelar mi acción
        </Button>,
      );
    }
    const chosen = me.nightAction;
    status = chosen
      ? `Has decidido ${abilityLabel(chosen.ability)}${chosen.targetId ? ` a ${nick(chosen.targetId)}` : ""}${chosen.secondTargetId ? ` y a ${nick(chosen.secondTargetId)}` : ""}${chosen.choice ? ` (${choiceText(chosen.choice)})` : ""} esta noche.`
      : me.nightAbilities.length ? "Aún no has elegido acción esta noche." : "Esta noche no tienes nada que hacer.";
    for (const ab of me.nightAbilities) {
      if (ab.usesLeft === 0) continue;
      const label = `${abilityLabel(ab.key)}${usesText(ab.usesLeft)}`;
      const choice = ab.choices ? choices[ab.key] ?? "" : null;
      // Sin elegir rol, el Forger guarda como Ambusher (wiki: Forger.md:242): el botón no se bloquea por eso.
      const needsChoice = ab.choices !== null && !choice && ab.defaultChoice === null;
      // Si la habilidad elige algo (mensaje o rol), el selector va justo antes del botón.
      const picker = ab.choices ? (
        <select
          key={`${ab.key}-choice`}
          aria-label={`Elegir para ${abilityLabel(ab.key)}`}
          className="cartoon-input !w-auto !py-1"
          value={choice ?? ""}
          onChange={(e) => setChoices((c) => ({ ...c, [ab.key]: e.target.value }))}
        >
          <option value="">{ab.choices.length > 10 ? "Elige un rol…" : "Elige…"}</option>
          {ab.choices.map((c) => <option key={c} value={c}>{choiceText(c)}</option>)}
        </select>
      ) : null;
      if (picker) actions.push(picker);
      // Texto de la habilidad: nota de muerte (wiki: Death_Note_ToS.md:17, se escribe antes de matar) o testamento
      // falsificado del Forger (wiki: Forger.md:204). Ambos hasta 400 caracteres.
      const text = ab.deathNote || ab.writesWill ? notes[ab.key] ?? "" : "";
      if (ab.deathNote || ab.writesWill) {
        actions.push(
          <textarea
            key={`${ab.key}-text`}
            aria-label={ab.writesWill ? "Testamento falsificado" : "Nota de muerte"}
            maxLength={MAX_DEATH_NOTE}
            rows={2}
            placeholder={ab.writesWill ? "Testamento falsificado (vacío: no deja testamento)" : "Nota de muerte (opcional)"}
            className="cartoon-input !w-full"
            value={text}
            onChange={(e) => setNotes((n) => ({ ...n, [ab.key]: e.target.value }))}
          />,
        );
      }
      const withChoice = {
        ...(choice ? { choice } : {}),
        ...(ab.deathNote && text.trim() ? { note: text } : {}),
        ...(ab.writesWill ? { forgedWill: text } : {}),
      };
      // La habilidad se usa desde un botón redondo, como el amuleto de Town of Salem.
      if (ab.target === "none") {
        actions.push(<Button key={ab.key} className="ability-btn" disabled={busy || needsChoice} onClick={() => dispatch({ type: "night.action", actorId: me.id, ability: ab.key, targetId: null, ...withChoice })}>{label}</Button>);
      } else if (ab.target === "player") {
        actions.push(<Button key={ab.key} className="ability-btn" disabled={busy || !target || needsChoice} onClick={() => dispatch({ type: "night.action", actorId: me.id, ability: ab.key, targetId: target, ...withChoice })}>{label}</Button>);
      } else {
        // Dos objetivos: el primero es el que tocaste primero (Retributionist: el Town muerto; Disguiser: el Mafioso).
        actions.push(<Button key={ab.key} className="ability-btn" disabled={busy || !target || !second || needsChoice} onClick={() => dispatch({ type: "night.action", actorId: me.id, ability: ab.key, targetId: target, secondTargetId: second, ...withChoice })}>{label}</Button>);
      }
    }
  }

  if (ghostActions && view.phase !== "night") {
    // Un Medium muerto abre su sesión de día para la noche siguiente, una sola vez en la partida.
    status = me.nightAction?.targetId
      ? `Tu sesión es para esta noche con ${nick(me.nightAction.targetId)}.`
      : "Puedes abrir una sesión con un vivo para esta noche, una sola vez en la partida.";
  }
  if ((alive || ghostActions) && DAY_PHASES.includes(view.phase)) {
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
    <Card className={`${className} short-actions`}>
      <h3 className="mb-2 font-display text-xl">Tus acciones</h3>
      {status && <p className="mb-3 font-semibold">{status}</p>}
      {actions.length ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : <p className="text-sm">No tienes nada que hacer ahora.</p>}
      {view.phase === "night" && me.nightAction && <p className="mt-2 text-sm">Puedes cambiar o cancelar tu elección hasta que acabe la noche.</p>}
    </Card>
  );
}
