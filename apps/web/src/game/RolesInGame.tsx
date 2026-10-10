import type { MatchView } from "../types.js";
import { ALIGNMENT_NAMES, ALIGNMENT_ORDER, ROLE_NAMES, alignmentLabel } from "../lib/roles.js";
import { Card } from "../ui/primitives.js";

/** Un rol en la lista: píldora pequeña para que quepan todos en la columna. */
function Chip({ children, inGame, className = "" }: { children: React.ReactNode; inGame: boolean; className?: string }) {
  const style = inGame ? className || "bg-sun" : "bg-white/40 opacity-60";
  return <span className={`rounded-full border-2 border-ink px-1.5 font-display text-[11px] leading-5 ${style}`}>{children}</span>;
}

/**
 * Roles por grupo, como la lista de roles de ToS: de cada grupo que hay en la partida se ven todos sus roles del MVP.
 * Los que están en esta partida van rellenos (con cuántos); los demás, apagados. Así se sabe qué roles exactos hay.
 */
export function RolesInGame({ roles, pool, className = "" }: { roles: MatchView["rolesInGame"]; pool: MatchView["rolePool"]; className?: string }) {
  const inGame = new Map<string, number>();
  for (const r of roles) inGame.set(r.key, (inGame.get(r.key) ?? 0) + 1);
  const presentGroups = ALIGNMENT_ORDER.filter((alignment) => roles.some((r) => r.alignment === alignment));
  const others = roles.filter((r) => !ALIGNMENT_ORDER.includes(r.alignment ?? ""));
  const byName = (a: string, b: string) => (ROLE_NAMES[a] ?? a).localeCompare(ROLE_NAMES[b] ?? b);

  return (
    <Card className={`p-2 ${className}`}>
      <h3 className="mb-1 font-display text-sm">Roles en la partida</h3>
      <div className="space-y-1.5">
        {presentGroups.map((alignment) => {
          const keys = pool.filter((r) => r.alignment === alignment).map((r) => r.key).sort(byName);
          const mafia = ALIGNMENT_NAMES[alignment]!.faction === "Mafia";
          return (
            <div key={alignment}>
              <p className="text-[11px] font-semibold leading-tight">{alignmentLabel(alignment)}</p>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {keys.map((key) => {
                  const n = inGame.get(key) ?? 0;
                  return (
                    <Chip key={key} inGame={n > 0} className={mafia ? "bg-mafia text-paper" : ""}>
                      {ROLE_NAMES[key] ?? key}{n > 1 ? ` ×${n}` : ""}
                    </Chip>
                  );
                })}
              </div>
            </div>
          );
        })}
        {others.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {others.map((r, i) => <Chip key={`${r.key}-${i}`} inGame>{ROLE_NAMES[r.key] ?? r.key}</Chip>)}
          </div>
        )}
        <p className="text-[10px] opacity-70">Relleno: está en esta partida. Apagado: no está.</p>
      </div>
    </Card>
  );
}
