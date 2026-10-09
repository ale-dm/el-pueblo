import type { Phase } from "../types.js";

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
