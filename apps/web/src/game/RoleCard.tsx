import type { MatchView } from "../types.js";
import { ROLE_BLURB } from "../lib/roles.js";
import { Card, Pill } from "../ui/primitives.js";

const FLAG_TEXT: Record<string, string> = {
  blackmailed: "Silenciado durante el día",
  jailed: "Encarcelado esta noche",
  framed: "Parecerás sospechoso",
  cleaned: "Tu rol quedará oculto",
  mayorRevealed: "Mayor revelado: tu voto cuenta por tres",
  noExecute: "Ya no puedes ejecutar",
};

export function RoleCard({ me }: { me: MatchView["me"] }) {
  return (
    <Card className="w-full">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-2xl">{me.roleName ?? "Sin rol aún"}</h2>
        {me.faction && <Pill className={me.faction === "mafia" ? "bg-mafia text-paper" : "bg-town text-paper"}>{me.faction === "mafia" ? "Mafia" : "Pueblo"}</Pill>}
      </div>
      {me.roleKey && ROLE_BLURB[me.roleKey] && <p className="mt-2 text-base">{ROLE_BLURB[me.roleKey]}</p>}
      {Object.keys(me.flags).filter((f) => FLAG_TEXT[f]).map((f) => (
        <p key={f} className="mt-2 font-semibold text-blood">{FLAG_TEXT[f]}</p>
      ))}
    </Card>
  );
}
