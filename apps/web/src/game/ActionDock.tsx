import { useEffect, useState } from "react";
import type { MatchView } from "../types.js";
import { roleIconUrl } from "../lib/roleImages.js";
import { ActionPanel } from "./ActionPanel.js";

interface Props {
  view: MatchView;
  targets: string[];
  clearTargets: () => void;
}

interface Kind {
  /** Icono del rol (wiki) si la acción es de su habilidad; si no, un emoji. */
  icon: string | null;
  emoji: string;
  label: string;
}

/**
 * Qué acción hay ahora mismo. El icono aparece solo en la fase en que se puede usar, como en Town of Salem:
 * la habilidad del rol de noche o de día, y la papeleta al votar.
 */
export function dockKind(view: MatchView): Kind | null {
  const me = view.me;
  const alive = me.status === "alive";
  switch (view.phase) {
    case "voting":
      return alive ? { icon: null, emoji: "🗳️", label: "Votar" } : null;
    case "judgement":
      return alive && view.defendantId !== me.id ? { icon: null, emoji: "⚖️", label: "Juzgar" } : null;
    case "night": {
      // La vista ya solo trae las habilidades de noche de cada estado (vivo o muerto): basta con mirar los usos.
      const usable = me.nightAbilities.some((a) => a.usesLeft !== 0);
      return usable ? { icon: roleIconUrl(me.roleKey), emoji: "🌙", label: "Acción de noche" } : null;
    }
    case "day_1":
    case "discussion": {
      const usable = me.dayAbilities.some((a) => a.usesLeft !== 0);
      return usable ? { icon: roleIconUrl(me.roleKey), emoji: "☀️", label: "Acción de día" } : null;
    }
    default:
      return null;
  }
}

// En móvil el contenedor va en el flujo, entre la lista y el chat (no tapa el botón de enviar); en escritorio flota abajo a la derecha.
/** Botón redondo abajo a la derecha. Al pulsarlo abre la acción sobre los objetivos elegidos en la lista. */
export function ActionDock({ view, targets, clearTargets }: Props) {
  const [open, setOpen] = useState(false);
  // Al cambiar de fase, la acción anterior ya no vale: se cierra.
  useEffect(() => setOpen(false), [view.phase, view.dayNumber]);
  const kind = dockKind(view);
  if (!kind) return null;
  return (
    <div className="pointer-events-none relative flex flex-col items-end gap-3 md:fixed md:bottom-4 md:right-[17.5rem] md:z-40">
      {open && (
        <div className="pointer-events-auto max-h-[60dvh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto">
          <div className="mb-2 flex justify-end">
            <button type="button" onClick={() => setOpen(false)} className="cartoon-btn px-3 py-1 text-sm">
              Cerrar
            </button>
          </div>
          <ActionPanel view={view} targets={targets} clearTargets={() => { clearTargets(); setOpen(false); }} />
        </div>
      )}
      <button
        type="button"
        aria-label={kind.label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="pointer-events-auto relative flex size-20 items-center justify-center rounded-full border-4 border-ink bg-sun shadow-[4px_4px_0_var(--color-ink)] transition active:translate-x-1 active:translate-y-1 active:shadow-none"
      >
        {kind.icon ? <img src={kind.icon} alt="" className="size-16 object-contain" /> : <span aria-hidden="true" className="text-4xl">{kind.emoji}</span>}
        {targets.length > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full border-2 border-ink bg-blood px-2 font-display text-sm text-paper">{targets.length}</span>
        )}
      </button>
    </div>
  );
}
