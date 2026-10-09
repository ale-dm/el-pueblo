import type { PlayerId } from "../types/ids.js";

/** Lo que hace una acción nocturna. El pipeline de la noche decide cuándo y con qué resultado. */
/** "bug": lo que recibe el objetivo esta noche (Spy). "mafiaVisits": las visitas de la Mafia (Spy). */
export type Check = "suspicious" | "role" | "alignment" | "visitors" | "targets" | "mafiaVisits" | "vision" | "bug";

export type Effect =
  /** Bloquea la acción del objetivo (Bootlegger, Tavern Keeper). */
  | { kind: "block"; actorId: PlayerId; targetId: PlayerId }
  /** Intercambia los objetivos de dos jugadores (Transporter). */
  | { kind: "transport"; actorId: PlayerId; firstId: PlayerId; secondId: PlayerId }
  /** Protege al objetivo de ataques. power: 1 básico, 2 poderoso. */
  | { kind: "protect"; actorId: PlayerId; targetId: PlayerId; power: 1 | 2; source: "doctor" | "bodyguard" | "crusader" }
  /** Ataque directo al objetivo. */
  | { kind: "attack"; actorId: PlayerId; targetId: PlayerId; power: 1 | 2; cause: string; unstoppable?: boolean }
  /** Ataca a los que visiten la casa `houseId` esta noche. `single`: a uno solo, al azar (Crusader, Ambusher).
   * `spareMafia`: nunca a un miembro de la Mafia (Ambusher). */
  | { kind: "attackVisitors"; actorId: PlayerId; houseId: PlayerId; power: 1 | 2; cause: string; single?: boolean; spareMafia?: boolean }
  /** Ataque de la Mafia. Solo el Godfather da órdenes: si actúa, su objetivo prevalece. */
  | { kind: "mafiaKill"; actorId: PlayerId; targetId: PlayerId; role: "godfather" | "mafioso" }
  /** Investigación. El resultado se calcula con el estado de la noche. */
  | { kind: "investigate"; actorId: PlayerId; targetId: PlayerId | null; check: Check }
  /** Marca al objetivo (encuadrado, limpiado, chantajeado). */
  | { kind: "mark"; actorId: PlayerId; targetId: PlayerId; flag: "framed" | "cleaned" | "blackmailed" | "zombied" }
  /** Disfraz: el Mafioso `targetId` aparece como `asId` ante el Investigador y el Sheriff esta noche. */
  | { kind: "disguise"; actorId: PlayerId; targetId: PlayerId; asId: PlayerId }
  /** Mensaje falso que recibe `targetId` al terminar la noche (Hypnotist). */
  | { kind: "hypnosis"; actorId: PlayerId; targetId: PlayerId; message: "attacked" | "protected" | "roleblocked" }
  /** Falsifica la última voluntad de `targetId`: al morir, se muestra como el rol `role`. */
  | { kind: "forge"; actorId: PlayerId; targetId: PlayerId; role: string }
  /** Coloca una trampa en la casa del objetivo; se activa al día siguiente. */
  | { kind: "trap"; actorId: PlayerId; targetId: PlayerId }
  /** El Veteran se pone en alerta. */
  | { kind: "alert"; actorId: PlayerId }
  /** Sin efecto en el MVP (habilidades fuera de alcance, ver docs/ENGINE.md). */
  | { kind: "none"; actorId: PlayerId };
