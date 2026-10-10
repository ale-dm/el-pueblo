import type { MatchView } from "../types.js";
import { ALIGNMENT_NAMES, ALIGNMENT_ORDER, ROLE_NAMES, alignmentLabel } from "../lib/roles.js";
import { Card } from "../ui/primitives.js";

/** Un rol en la lista: píldora pequeña para que quepan todos en la columna. */
function Chip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`rounded-full border-2 border-ink px-1.5 font-display text-[11px] leading-5 ${className || "bg-sun"}`}>{children}</span>;
}

/** Roles de la partida agrupados por bando y tipo, como la lista de roles de ToS. */
export function RolesInGame({ roles, className = "" }: { roles: MatchView["rolesInGame"]; className?: string }) {
  const groups = ALIGNMENT_ORDER.map((alignment) => {
    const counts = new Map<string, number>();
    for (const r of roles) if (r.alignment === alignment) counts.set(r.key, (counts.get(r.key) ?? 0) + 1);
    return { alignment, counts: [...counts] };
  }).filter((g) => g.counts.length > 0);
  const others = roles.filter((r) => !ALIGNMENT_ORDER.includes(r.alignment ?? ""));

  return (
    <Card className={`p-2 ${className}`}>
      <h3 className="mb-1 font-display text-sm">Roles en la partida</h3>
      <div className="space-y-1.5">
        {groups.map((g) => (
          <div key={g.alignment}>
            <p className="text-[11px] font-semibold leading-tight">{alignmentLabel(g.alignment)}</p>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {g.counts.map(([key, n]) => (
                <Chip key={key} className={ALIGNMENT_NAMES[g.alignment]!.faction === "Mafia" ? "bg-mafia text-paper" : ""}>
                  {ROLE_NAMES[key] ?? key}{n > 1 ? ` ×${n}` : ""}
                </Chip>
              ))}
            </div>
          </div>
        ))}
        {others.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {others.map((r, i) => <Chip key={`${r.key}-${i}`}>{ROLE_NAMES[r.key] ?? r.key}</Chip>)}
          </div>
        )}
      </div>
    </Card>
  );
}
