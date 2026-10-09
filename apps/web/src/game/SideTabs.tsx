import { useState } from "react";
import type { MatchView } from "../types.js";
import { RoleCard } from "./RoleCard.js";
import { RolesInGame } from "./RolesInGame.js";
import { WillCard } from "./WillCard.js";

/** Panel izquierdo: tu rol, la lista de roles y tu testamento, en pestañas. */
export function SideTabs({ view, className = "" }: { view: MatchView; className?: string }) {
  const [tab, setTab] = useState<"role" | "roles" | "will">("role");
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
            onClick={() => setTab(t.key)}
            className={`cartoon-btn px-1 py-1 ${tab === t.key ? "" : "opacity-60"}`}
          >
            {/* El tamaño va en el texto: la clase de botón de la marca fija el suyo. */}
            <span className="text-[12px] leading-tight">{t.label}</span>
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {tab === "role" && <RoleCard me={view.me} />}
        {tab === "roles" && <RolesInGame roles={view.rolesInGame} />}
        {tab === "will" && <WillCard me={view.me} />}
      </div>
    </div>
  );
}
