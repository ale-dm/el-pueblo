import { useState } from "react";
import type { MatchView } from "../types.js";
import { ALIGNMENT_NAMES, ALIGNMENT_ORDER, ROLE_BLURB, ROLE_NAMES, alignmentLabel, levelEs } from "../lib/roles.js";
import { Card, Pill } from "../ui/primitives.js";
import { Sheet } from "./Sheet.js";

type PoolRole = MatchView["rolePool"][number];

/**
 * Todos los roles del MVP, por grupo. No dice cuáles están en esta partida: eso es parte del misterio. Tocar un rol
 * abre su ficha: qué hace y con qué ataque y defensa.
 */
export function RoleBook({ pool, className = "" }: { pool: MatchView["rolePool"]; className?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const byName = (a: string, b: string) => (ROLE_NAMES[a] ?? a).localeCompare(ROLE_NAMES[b] ?? b);
  const role = open ? pool.find((r) => r.key === open) : undefined;

  return (
    <Card className={`p-2 ${className}`}>
      <h3 className="mb-1 font-display text-sm">Todos los roles</h3>
      <div className="space-y-1.5">
        {ALIGNMENT_ORDER.map((alignment) => {
          const keys = pool.filter((r) => r.alignment === alignment).map((r) => r.key).sort(byName);
          if (keys.length === 0) return null;
          const mafia = ALIGNMENT_NAMES[alignment]!.faction === "Mafia";
          return (
            <div key={alignment}>
              <p className="text-[11px] font-semibold leading-tight">{alignmentLabel(alignment)}</p>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {keys.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setOpen(key)}
                    className={`rounded-full border-2 border-ink px-2 font-display text-xs leading-6 ${mafia ? "bg-mafia/25" : "bg-white/70"}`}
                  >
                    {ROLE_NAMES[key] ?? key}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {role && (
        <Sheet title={ROLE_NAMES[role.key] ?? role.key} onClose={() => setOpen(null)} fit>
          <RoleFile role={role} />
        </Sheet>
      )}
    </Card>
  );
}

/** Ficha de un rol: grupo, qué hace y su ataque y defensa, como en la carta de la wiki. */
function RoleFile({ role }: { role: PoolRole }) {
  const mafia = role.alignment ? ALIGNMENT_NAMES[role.alignment]?.faction === "Mafia" : false;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <div className="flex flex-wrap items-center gap-2">
        <Pill className={mafia ? "bg-mafia text-paper" : "bg-town text-paper"}>{mafia ? "Mafia" : "Pueblo"}</Pill>
        {alignmentLabel(role.alignment) && <span className="text-sm font-semibold">{alignmentLabel(role.alignment)}</span>}
      </div>
      <p className="text-base">{ROLE_BLURB[role.key] ?? "Sin descripción."}</p>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl border-2 border-ink bg-white/70 p-2">
          <dt className="font-display text-base">Ataque</dt>
          <dd className="font-semibold">{levelEs(role.attack) ?? "—"}</dd>
        </div>
        <div className="rounded-xl border-2 border-ink bg-white/70 p-2">
          <dt className="font-display text-base">Defensa</dt>
          <dd className="font-semibold">{levelEs(role.defense) ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
