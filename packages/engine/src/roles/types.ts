import type { FactionKey } from "../types/factions.js";
import type { PlayerId } from "../types/ids.js";
import type { GameState, PlayerState } from "../types/state.js";
import type { Catalog } from "../types/catalog.js";
import type { Rng } from "../core/rng.js";
import type { Effect } from "./effects.js";

/** Habilidad nocturna de un rol. */
export interface NightAbility {
  key: string;
  /** "player": necesita un objetivo vivo. "none": sin objetivo. "two": dos objetivos. */
  target: "player" | "none" | "two";
  /** Usos por partida, o null si son ilimitados. */
  usesLimit: number | null;
  /** Si el objetivo puede ser el propio jugador. */
  selfAllowed?: boolean;
  /** Solo la puede usar un jugador muerto (Medium: hablar con los vivos desde el más allá). */
  deadOnly?: boolean;
  /** Elección extra: una lista de opciones, o "roles" para cualquier rol del juego. */
  choices?: readonly string[] | "roles";
  /** Elección múltiple: varias opciones marcadas, separadas por comas (wiki: Jailor.md:322). */
  multiChoices?: readonly string[];
  /** Bloquea la habilidad de noche del objetivo: solo cabe a quien puede ser bloqueado (ver rules/roleblock.ts). */
  roleblock?: boolean;
  /** Quien mata puede dejar una nota de muerte, que se muestra al amanecer junto a la víctima (wiki: Godfather.md:235, Mafioso.md:237). */
  deathNote?: boolean;
}

/** Habilidad de día (Jailor, Mayor). */
export interface DayAbility {
  key: string;
  target: "player" | "none";
  /** Una vez por día. */
  oncePerDay: boolean;
  usesLimit: number | null;
  /** Solo la puede usar un jugador muerto (Medium: abre su sesión de día para la noche siguiente). */
  deadOnly?: boolean;
}

export interface ResolveContext {
  state: GameState;
  /** Clave de la habilidad que se usa (un rol puede tener varias). */
  ability: string;
  actor: PlayerState;
  targetId: PlayerId | null;
  secondTargetId: PlayerId | null;
  /** Elección de la habilidad (mensaje del Hypnotist, rol del Forger). */
  choice: string | null;
  catalog: Catalog;
  rng: Rng;
}

export interface RoleHandler {
  key: string;
  name: string;
  faction: FactionKey;
  /** Prioridad de resolución del catálogo (roles.priority). Menor se resuelve antes. */
  priority: number | null;
  nightAbilities: readonly NightAbility[];
  dayAbilities: readonly DayAbility[];
  /** Inmune a bloqueos (Tavern Keeper, Veteran). */
  roleblockImmune?: boolean;
  /** Actúa cada noche sin elegir nada (Psychic). El motor le añade la acción automáticamente. */
  passive?: boolean;
  /** Efectos de una acción nocturna. Cada rol define el suyo. */
  resolveNight: (ctx: ResolveContext) => Effect[];
  /** Notas de lo que no se implementa en el MVP y por qué. */
  gaps?: string;
}
