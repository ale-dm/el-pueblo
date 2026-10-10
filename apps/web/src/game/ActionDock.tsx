import { useEffect, useState } from "react";
import { useGame } from "../state/store.js";
import type { MatchView } from "../types.js";
import { roleIconUrl } from "../lib/roleImages.js";
import { abilityLabel, CHOICE_LABEL } from "../lib/text.js";
import { ROLE_NAMES } from "../lib/roles.js";
import { abilityPlan, dockAbilities, votePlan, type DockAbility } from "../lib/quickAction.js";

interface Props {
  view: MatchView;
  targets: string[];
  clearTargets: () => void;
}

/** Más de estas opciones, se muestran en una lista desplegable en vez de botones (el rol del Forger). */
const CHIP_LIMIT = 8;

/** Nombre de una opción: mensajes en español, roles en inglés. */
const choiceText = (c: string) => CHOICE_LABEL[c] ?? ROLE_NAMES[c] ?? c;

/**
 * Botones de acción abajo a la derecha, sin recuadro ni panel. Cada habilidad es un botón con el icono de su rol
 * (wiki). Se usa sobre lo elegido en la lista lateral. Si la habilidad pide una opción (mensaje, rol), aparecen
 * las opciones junto al botón.
 */
export function ActionDock({ view, targets, clearTargets }: Props) {
  const send = useGame((s) => s.send);
  const busy = useGame((s) => s.busy);
  // Habilidad que está pidiendo su opción (mensaje o rol).
  const [choosing, setChoosing] = useState<string | null>(null);
  useEffect(() => setChoosing(null), [view.phase, view.dayNumber]);

  const me = view.me;
  const alive = me.status === "alive";
  const roleIcon = roleIconUrl(me.roleKey);
  const fire = (command: Record<string, unknown>) => {
    void send(command);
    clearTargets();
    setChoosing(null);
  };

  // Juicio: dos botones redondos.
  if (view.phase === "judgement" && alive && view.defendantId !== me.id) {
    return (
      <div className="relative flex items-end justify-end gap-3 md:fixed md:bottom-4 md:right-[17.5rem] md:z-40">
        <button type="button" disabled={busy} onClick={() => void send({ type: "judgement.vote", voterId: me.id, verdict: "guilty" })} className="cartoon-btn danger flex size-20 items-center justify-center rounded-full text-sm">
          Culpable
        </button>
        <button type="button" disabled={busy} onClick={() => void send({ type: "judgement.vote", voterId: me.id, verdict: "innocent" })} className="cartoon-btn town flex size-20 items-center justify-center rounded-full text-sm">
          Inocente
        </button>
      </div>
    );
  }

  // Votación: votar al elegido en la lista, o abstenerse.
  if (view.phase === "voting") {
    if (!alive) return null;
    const plan = votePlan(view, targets);
    return (
      <div className="relative flex flex-col items-end gap-2 md:fixed md:bottom-4 md:right-[17.5rem] md:z-40">
        {plan.kind === "needs" && <Hint text={plan.hint} />}
        <button type="button" disabled={busy} onClick={() => void send({ type: "vote", voterId: me.id, targetId: null })} className="cartoon-btn px-3 py-1 text-sm">
          Abstenerse
        </button>
        <button
          type="button"
          aria-label="Votar"
          disabled={busy || plan.kind !== "command"}
          onClick={() => plan.kind === "command" && fire(plan.command)}
          className="cartoon-btn flex size-20 items-center justify-center rounded-full"
        >
          <span aria-hidden="true" className="text-4xl">🗳️</span>
        </button>
      </div>
    );
  }

  const abilities = dockAbilities(view);
  if (abilities.length === 0) return null;

  return (
    <div className="relative flex flex-col items-end gap-3 md:fixed md:bottom-4 md:right-[17.5rem] md:z-40">
      {abilities.map((ability) => (
        <AbilityButton
          key={ability.key}
          ability={ability}
          icon={roleIcon}
          view={view}
          targets={targets}
          busy={busy}
          choosing={choosing === ability.key}
          onTap={() => {
            const plan = abilityPlan(view, ability, targets, null);
            if (plan.kind === "command") fire(plan.command);
            else if (plan.kind === "choose") setChoosing(ability.key);
          }}
          onChoose={(option) => {
            const plan = abilityPlan(view, ability, targets, option);
            if (plan.kind === "command") fire(plan.command);
          }}
        />
      ))}
    </div>
  );
}

interface AbilityButtonProps {
  ability: DockAbility;
  icon: string | null;
  view: MatchView;
  targets: string[];
  busy: boolean;
  choosing: boolean;
  onTap: () => void;
  onChoose: (option: string) => void;
}

function AbilityButton({ ability, icon, view, targets, busy, choosing, onTap, onChoose }: AbilityButtonProps) {
  const label = abilityLabel(ability.key);
  const plan = abilityPlan(view, ability, targets, null);
  const needs = plan.kind === "needs" ? plan.hint : null;
  return (
    <div className="flex flex-col items-end gap-2">
      {needs && <Hint text={needs} />}
      {choosing && ability.choices && (
        ability.choices.length > CHIP_LIMIT ? (
          <select
            aria-label={`Elige para ${label}`}
            defaultValue=""
            onChange={(e) => e.target.value && onChoose(e.target.value)}
            className="cartoon-input max-w-[16rem] text-sm"
          >
            <option value="" disabled>Elige…</option>
            {ability.choices.map((c) => (
              <option key={c} value={c}>{choiceText(c)}</option>
            ))}
          </select>
        ) : (
          <div className="flex max-w-[16rem] flex-wrap justify-end gap-1">
            {ability.choices.map((c) => (
              <button key={c} type="button" disabled={busy} onClick={() => onChoose(c)} className="cartoon-btn px-2 py-0.5 text-xs">
                {choiceText(c)}
              </button>
            ))}
          </div>
        )
      )}
      <button
        type="button"
        aria-label={label}
        title={label}
        disabled={busy || needs !== null}
        onClick={onTap}
        className="cartoon-btn flex w-24 flex-col items-center gap-1 rounded-2xl px-2 py-1 text-sm"
      >
        {icon ? <img src={icon} alt="" className="size-12 object-contain" /> : <span aria-hidden="true" className="text-3xl">⭐</span>}
        <span className="leading-tight">{label}</span>
      </button>
    </div>
  );
}

function Hint({ text }: { text: string }) {
  return <span className="rounded-full border-2 border-ink bg-paper px-3 py-0.5 text-xs font-semibold">{text}</span>;
}
