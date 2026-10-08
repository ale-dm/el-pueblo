import type { GameEvent, Phase } from "../types.js";

export const PHASE_LABEL: Record<Phase, string> = {
  day_1: "Primer día",
  discussion: "Discusión",
  voting: "Votación",
  defense: "Defensa",
  judgement: "Juicio",
  last_words: "Últimas palabras",
  night: "Noche",
  ended: "Fin de la partida",
};

export const isNight = (phase: Phase) => phase === "night";

export const CHANNEL_LABEL = { public: "Plaza", mafia: "Mafia", dead: "Ultratumba" } as const;

const ABILITY_LABEL: Record<string, string> = {
  kill: "Atacar", ambush: "Emboscar", blackmail: "Chantajear", distract: "Distraer", check: "Consultar",
  disguise: "Disfrazar", forge: "Falsificar", frame: "Incriminar", clean: "Limpiar", hypnotize: "Hipnotizar",
  interrogate: "Interrogar", investigate: "Investigar", watch: "Vigilar", track: "Rastrear", bug: "Espiar",
  vision: "Ver visión", heal: "Curar", protect: "Proteger", execute: "Ejecutar", jail: "Encarcelar",
  seance: "Sesión", reveal: "Revelarme", raise: "Alzar", alert: "Ponerme en alerta", transport: "Transportar",
  trap: "Colocar trampa", shoot: "Disparar",
};
export const abilityLabel = (key: string) => ABILITY_LABEL[key] ?? key;

const VERDICT = { guilty: "culpable", innocent: "inocente" } as const;
const CAUSE: Record<string, string> = {
  mafia: "ha sido asesinado por la Mafia", shot: "ha sido abatido a tiros", execute: "ha sido ejecutado",
  ambush: "ha sido emboscado", veteran: "ha sido abatido por un Veterano", trap: "ha caído en una trampa",
  crusade: "ha sido abatido por el Cruzado", bodyguard: "ha muerto en un duelo con un Guardaespaldas",
  guilt: "se ha quitado la vida por culpa",
};
const FACTION_WIN = { town: "¡Gana el pueblo!", mafia: "¡Gana la Mafia!" } as const;

/** Frase en español para un evento, o null si no se muestra en el registro. `nick` resuelve ids. */
export function eventLine(e: GameEvent, nick: (id: string) => string): string | null {
  const p = e.payload;
  switch (e.type) {
    case "phase.started":
      return p.phase === "night" ? "Cae la noche…" : p.phase === "discussion" ? `Día ${p.dayNumber}: a hablar` : null;
    case "vote.cast":
      return p.targetId ? `${nick(p.voterId)} vota a ${nick(p.targetId)}` : `${nick(p.voterId)} se abstiene`;
    case "trial.started":
      return `${nick(p.defendantId)} va a juicio`;
    case "judgement.cast":
      return null;
    case "trial.verdict":
      return `${nick(p.defendantId)} es declarado ${VERDICT[p.verdict as keyof typeof VERDICT]}`;
    case "player.hanged":
      return `${nick(p.playerId)} ha sido ahorcado`;
    case "player.killed":
      return `${nick(p.playerId)} ${CAUSE[p.cause] ?? "ha muerto"}`;
    case "night.resolved":
      return "La noche termina";
    case "investigation.result":
      return `Resultado de tu investigación: ${p.result}`;
    case "chat.message":
      return `${nick(p.senderId)}: ${p.text}`;
    case "game.ended":
      return FACTION_WIN[p.winner as keyof typeof FACTION_WIN] ?? "Fin de la partida";
    case "attack.prevented":
      return null;
    case "night.action.blocked":
      return "Tu acción fue bloqueada esta noche";
    case "player.jailed":
      return "Has sido encarcelado";
    case "player.blackmailed":
      return "Estás silenciado durante el día";
    default:
      return null;
  }
}
