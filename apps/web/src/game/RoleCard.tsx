import type { MatchView } from "../types.js";
import { ROLE_BLURB, alignmentLabel, levelEs, roleName } from "../lib/roles.js";
import { roleIconUrl, roleSkinUrl } from "../lib/roleImages.js";
import { abilityLabel } from "../lib/text.js";
import { Card, Pill } from "../ui/primitives.js";

const FLAG_TEXT: Record<string, string> = {
  blackmailed: "Silenciado durante el día",
  jailed: "Encarcelado esta noche",
  framed: "Parecerás sospechoso",
  cleaned: "Tu rol quedará oculto",
  mayorRevealed: "Mayor revelado: tu voto cuenta por tres",
  noExecute: "Ya no puedes ejecutar",
};

/** Lo que se pide al bando, como la línea "Goal" de la carta en Town of Salem. */
const GOAL: Record<string, string> = {
  town: "Llevar a juicio y ahorcar a toda la Mafia.",
  mafia: "Eliminar a todo el pueblo.",
};

/**
 * Carta del rol, como en Town of Salem: alineamiento, objetivo, habilidades y atributos,
 * todo a la vista. Al morir se tiñe y lleva una lápida.
 */
export function RoleCard({ me }: { me: MatchView["me"] }) {
  const dead = me.status !== "alive";
  const name = roleName(me.roleKey) ?? me.roleName ?? "Sin rol aún";
  const faction = me.faction === "mafia" ? "Mafia" : me.faction === "town" ? "Pueblo" : null;
  const abilities = [...me.nightAbilities, ...me.dayAbilities];
  const flags = Object.keys(me.flags).filter((f) => FLAG_TEXT[f]);
  const attack = levelEs(me.attack);
  const defense = levelEs(me.defense);
  const icon = roleIconUrl(me.roleKey);
  const skin = roleSkinUrl(me.roleKey);

  return (
    <Card className={`w-full transition-colors ${dead ? "bg-red-100" : ""}`}>
      {skin && <img src={skin} alt={`Ilustración de ${name}`} className="mb-3 h-40 w-full rounded-xl border-4 border-ink object-cover md:h-24" />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {icon && <img src={icon} alt="" className="size-10 shrink-0" />}
          <h2 className={`min-w-0 font-display text-xl ${dead ? "line-through decoration-blood decoration-4" : ""}`}>{name}</h2>
        </div>
        {faction && <Pill className={me.faction === "mafia" ? "bg-mafia text-paper" : "bg-town text-paper"}>{faction}</Pill>}
      </div>

      {dead && (
        <p className="mt-2 inline-block -rotate-3 rounded-lg border-4 border-ink bg-paper px-3 py-1 font-display text-lg text-blood">✝ Has muerto</p>
      )}

      <dl className="mt-3 space-y-3 text-sm md:mt-2 md:space-y-1.5 md:text-xs">
        {alignmentLabel(me.alignment) && (
          <div>
            <dt className="font-display text-base md:text-sm">Alineamiento</dt>
            <dd className="font-semibold">{alignmentLabel(me.alignment)}</dd>
          </div>
        )}
        {me.faction && (
          <div>
            <dt className="font-display text-base md:text-sm">Objetivo</dt>
            <dd>{GOAL[me.faction]}</dd>
          </div>
        )}
        {me.roleKey && ROLE_BLURB[me.roleKey] && (
          <div>
            <dt className="font-display text-base md:text-sm">Descripción</dt>
            <dd>{ROLE_BLURB[me.roleKey]}</dd>
          </div>
        )}
        {abilities.length > 0 && (
          <div>
            <dt className="font-display text-base md:text-sm">Habilidades</dt>
            <dd>
              <ul className="list-inside list-disc">
                {abilities.map((a, i) => <li key={`${a.key}-${i}`}>{abilityLabel(a.key)}</li>)}
              </ul>
            </dd>
          </div>
        )}
        {(attack || defense) && (
          <div>
            <dt className="font-display text-base md:text-sm">Atributos</dt>
            <dd>
              {attack && <span className="mr-3">Ataque: <strong>{attack}</strong></span>}
              {defense && <span>Defensa: <strong>{defense}</strong></span>}
            </dd>
          </div>
        )}
      </dl>

      {flags.map((f) => (
        <p key={f} className="mt-2 font-semibold text-blood">{FLAG_TEXT[f]}</p>
      ))}
    </Card>
  );
}
