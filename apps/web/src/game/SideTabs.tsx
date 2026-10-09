import type { MatchView } from "../types.js";
import { RoleCard } from "./RoleCard.js";
import { RolesInGame } from "./RolesInGame.js";
import { WillCard } from "./WillCard.js";
import { DeathNoteCard } from "./DeathNoteCard.js";

export type SideTab = "role" | "roles" | "will";

/** Panel izquierdo: tu rol, la lista de roles y tu testamento, en pestañas. Controlado desde la pantalla. */
export function SideTabs({ view, tab, onTab, className = "" }: { view: MatchView; tab: SideTab; onTab: (t: SideTab) => void; className?: string }) {
  const tabs = [
    { key: "role", label: "Rol" },
    { key: "roles", label: "Roles" },
    { key: "will", label: "Testamento" },
  ] as const;
  return (
    <div className={`flex min-h-0 flex-col gap-2 ${className}`}>
      <div role="tablist" className="grid grid-cols-3 gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            type="button"
            onClick={() => onTab(t.key)}
            className={`cartoon-btn px-1 py-1 ${tab === t.key ? "" : "opacity-60"}`}
          >
            {/* El tamaño va en el texto: la clase de botón de la marca fija el suyo. */}
            <span className="block truncate text-[12px] leading-tight" title={t.label}>{t.label}</span>
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {/* La nota de muerte se cambia en la mañana del anuncio, sea cual sea la pestaña abierta (Death_Note_ToS.md:17). */}
        <DeathNoteCard view={view} />
        {tab === "role" && <RoleCard me={view.me} />}
        {tab === "roles" && <RolesInGame roles={view.rolesInGame} />}
        {tab === "will" && <WillCard me={view.me} />}
      </div>
    </div>
  );
}
