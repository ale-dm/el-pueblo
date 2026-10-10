import type { MatchView } from "../types.js";
import { ALIGNMENT_NAMES, ALIGNMENT_ORDER, ROLE_NAMES, alignmentLabel } from "../lib/roles.js";
import { Card, Pill } from "../ui/primitives.js";

/** Roles de la partida agrupados por bando y tipo, como la lista de roles de ToS. */
export function RolesInGame({ roles, className = "" }: { roles: MatchView["rolesInGame"]; className?: string }) {
  const groups = ALIGNMENT_ORDER.map((alignment) => {
    const counts = new Map<string, number>();
    for (const r of roles) if (r.alignment === alignment) counts.set(r.key, (counts.get(r.key) ?? 0) + 1);
    return { alignment, counts: [...counts] };
  }).filter((g) => g.counts.length > 0);
  const others = roles.filter((r) => !ALIGNMENT_ORDER.includes(r.alignment ?? ""));

  return (
    <Card className={className}>
      <h3 className="mb-2 font-display text-xl">Roles en la partida</h3>
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.alignment}>
            <p className="text-sm font-semibold">{alignmentLabel(g.alignment)}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {g.counts.map(([key, n]) => (
                <Pill key={key} className={ALIGNMENT_NAMES[g.alignment]!.faction === "Mafia" ? "bg-mafia text-paper" : ""}>
                  {ROLE_NAMES[key] ?? key}{n > 1 ? ` ×${n}` : ""}
                </Pill>
              ))}
            </div>
          </div>
        ))}
        {others.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {others.map((r, i) => <Pill key={`${r.key}-${i}`}>{ROLE_NAMES[r.key] ?? r.key}</Pill>)}
          </div>
        )}
      </div>
    </Card>
  );
}
