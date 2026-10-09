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
}

/** Habilidad de día (Jailor, Mayor). */
export interface DayAbility {
  key: string;
  target: "player" | "none";
  /** Una vez por día. */
  oncePerDay: boolean;
  usesLimit: number | null;
}

export interface ResolveContext {
  state: GameState;
  /** Clave de la habilidad que se usa (un rol puede tener varias). */
  ability: string;
  actor: PlayerState;
  targetId: PlayerId | null;
  secondTargetId: PlayerId | null;
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
