// Forma de lo que el servidor envía. Mantener en sintonía con apps/server (getView y match:events).

export type Phase =
  | "day_1" | "discussion" | "voting" | "defense" | "judgement" | "last_words" | "night" | "ended";

export interface GameEvent {
  seq: number;
  type: string;
  payload: Record<string, any>;
  visibility: "public" | "mafia" | "dead" | "private";
  audiencePlayerId: string | null;
}

export interface PublicPlayer {
  id: string;
  seat: number;
  nick: string;
  status: "alive" | "dead" | "disconnected";
  connected: boolean;
  /** Lo controla el servidor: juega solo. */
  isBot: boolean;
  /** Compañero de Mafia visible para quien mira. */
  ally: boolean;
  revealedRoleKey: string | null;
  /** Mayor revelado: público. Ni él susurra ni le susurran. */
  mayorRevealed: boolean;
}

export interface MatchView {
  matchId: string;
  roomCode: string;
  status: "lobby" | "playing" | "finished" | "abandoned";
  phase: Phase;
  dayNumber: number;
  defendantId: string | null;
  winner: "town" | "mafia" | null;
  /** Fin del temporizador de la fase actual (ISO), o null. */
  phaseEndsAt: string | null;
  /** Roles que hay en la partida, con su grupo (alineamiento). Público. */
  rolesInGame: Array<{ key: string; alignment: string | null }>;
  players: PublicPlayer[];
  votes: Record<string, string | null>;
  verdicts: Record<string, "guilty" | "innocent">;
  me: {
    id: string;
    seat: number;
    nick: string;
    status: "alive" | "dead" | "disconnected";
    roleKey: string | null;
    roleName: string | null;
    faction: "town" | "mafia" | null;
    roleSummary: string | null;
    flags: Record<string, boolean>;
    /** Cuerpos que el Retributionist ya ha usado (wiki: Retributionist.md:204). Vacío para los demás roles. */
    usedBodies: string[];
    nightAction: { ability: string; targetId: string | null; secondTargetId?: string | null; choice?: string | null; note?: string; forgedWill?: string } | null;
    /** Sesión de Médium esta noche: "medium" (la abre el Médium muerto) o "target" (el vivo elegido). */
    seance: "medium" | "target" | null;
    /** Tu última voluntad. */
    will: string | null;
    /** Grupo del rol (p. ej. town_support). */
    alignment: string | null;
    /** Canal con el prisionero: "jailor" si encarcelas a alguien, "prisoner" si te han encarcelado. */
    jail: "jailor" | "prisoner" | null;
    /** Ataque y defensa del catálogo (texto con condiciones). */
    attack: string | null;
    defense: string | null;
    /** Habilidades de noche: de vivo, o solo las de muerto (Medium). `choices`: opciones de la habilidad. */
    nightAbilities: Array<{ key: string; target: "player" | "none" | "two"; usesLeft: number | null; choices: string[] | null; deadOnly: boolean; deathNote: boolean; defaultChoice: string | null; writesWill: boolean }>;
    dayAbilities: Array<{ key: string; target: "player" | "none"; oncePerDay: boolean; usesLeft: number | null }>;
  };
}

export type Channel = "public" | "mafia" | "dead" | "whisper" | "jail" | "seance";
