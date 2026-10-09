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

export const CHANNEL_LABEL = { public: "Plaza", mafia: "Mafia", dead: "Ultratumba", whisper: "Susurro", jail: "Prisión", seance: "Sesión" } as const;

/**
 * Mensajes que puede plantar el Hypnotist, como los lee quien los recibe. Textos de la wiki (Hypnotist.md:232-256),
 * traducidos: "You were attacked but someone nursed you back to health!", "You were attacked but someone protected
 * you!", "Someone occupied your night. You were Roleblocked!" y su versión de inmunidad.
 */
export const HYPNOSIS_TEXT: Record<string, string> = {
  attacked: "Te atacaron, pero alguien te curó.",
  protected: "Te atacaron, pero alguien te protegió.",
  roleblocked: "Alguien ocupó tu noche: ¡fuiste bloqueado!",
  roleblock_immune: "Alguien intentó bloquearte, pero eres inmune.",
};

/** Opciones de elección de una habilidad: mensajes en español, roles en inglés. */
export const CHOICE_LABEL: Record<string, string> = {
  attacked: "Ser atacado",
  protected: "Ser protegido",
  roleblocked: "Ser bloqueado",
};

const ABILITY_LABEL: Record<string, string> = {
  kill: "Atacar", ambush: "Emboscar", blackmail: "Chantajear", distract: "Distraer", check: "Consultar",
  disguise: "Disfrazar", forge: "Falsificar", frame: "Incriminar", clean: "Limpiar", hypnotize: "Hipnotizar",
  interrogate: "Interrogar", investigate: "Investigar", watch: "Vigilar", track: "Rastrear", bug: "Espiar",
  vision: "Ver visión", heal: "Curar", protect: "Proteger", execute: "Ejecutar", jail: "Encarcelar",
  seance: "Sesión", reveal: "Revelarme", raise: "Alzar", alert: "Ponerme en alerta", transport: "Transportar",
  trap: "Colocar trampa", shoot: "Disparar", vest: "Chaleco antibalas",
};
export const abilityLabel = (key: string) => ABILITY_LABEL[key] ?? key;
