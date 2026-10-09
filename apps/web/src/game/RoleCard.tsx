import { useState } from "react";
import type { MatchView } from "../types.js";
import { ROLE_BLURB, roleNameEs } from "../lib/roles.js";
import { Button, Card, Pill } from "../ui/primitives.js";

const FLAG_TEXT: Record<string, string> = {
  blackmailed: "Silenciado durante el día",
  jailed: "Encarcelado esta noche",
  framed: "Parecerás sospechoso",
  cleaned: "Tu rol quedará oculto",
  mayorRevealed: "Mayor revelado: tu voto cuenta por tres",
  noExecute: "Ya no puedes ejecutar",
};

/** Lo que se pide al bando, como en el botón "Objetivo" de Town of Salem. */
const OBJECTIVE: Record<string, string> = {
  town: "Eliminad a toda la Mafia antes de que os eliminen a vosotros.",
  mafia: "Eliminad a todo el pueblo: que no quede nadie que pueda votaros.",
};

/** Carta del rol. Se puede plegar, como en ToS; al morir se tiñe y lleva una lápida. */
export function RoleCard({ me }: { me: MatchView["me"] }) {
  const [objective, setObjective] = useState(false);
  const dead = me.status !== "alive";
  const name = roleNameEs(me.roleKey) ?? me.roleName ?? "Sin rol aún";
  const faction = me.faction === "mafia" ? "Mafia" : me.faction === "town" ? "Pueblo" : null;

  return (
    <Card className={`w-full transition-colors ${dead ? "bg-red-100" : ""}`}>
      <details open className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
          <h2 className={`font-display text-2xl ${dead ? "line-through decoration-blood decoration-4" : ""}`}>{name}</h2>
          <span className="flex items-center gap-2">
            {faction && <Pill className={me.faction === "mafia" ? "bg-mafia text-paper" : "bg-town text-paper"}>{faction}</Pill>}
            <span aria-hidden="true" className="text-sm group-open:rotate-180">▼</span>
          </span>
        </summary>

        {dead && (
          <p className="mt-2 inline-block -rotate-3 rounded-lg border-4 border-ink bg-paper px-3 py-1 font-display text-lg text-blood">
            ✝ Has muerto
          </p>
        )}
        {me.roleKey && ROLE_BLURB[me.roleKey] && <p className="mt-2 text-base">{ROLE_BLURB[me.roleKey]}</p>}
        {Object.keys(me.flags).filter((f) => FLAG_TEXT[f]).map((f) => (
          <p key={f} className="mt-2 font-semibold text-blood">{FLAG_TEXT[f]}</p>
        ))}

        {me.faction && (
          <div className="mt-3">
            <Button tone="sun" className="text-base" aria-expanded={objective} onClick={() => setObjective((v) => !v)}>
              Objetivo
            </Button>
            {objective && <p className="mt-2 text-sm">{OBJECTIVE[me.faction]}</p>}
          </div>
        )}
      </details>
    </Card>
  );
}
