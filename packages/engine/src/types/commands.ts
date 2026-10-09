import type { PlayerId } from "./ids.js";

/** Intenciones de los jugadores. El motor las valida y devuelve eventos o un error. */
export type Command =
  | { type: "game.start"; hostId: PlayerId }
  | { type: "vote"; voterId: PlayerId; targetId: PlayerId | null }
  | { type: "judgement.vote"; voterId: PlayerId; verdict: "guilty" | "innocent" }
  | { type: "day.action"; actorId: PlayerId; ability: string; targetId: PlayerId | null }
  | {
      type: "night.action";
      actorId: PlayerId;
      ability: string;
      targetId: PlayerId | null;
      secondTargetId?: PlayerId | null;
      /** Elección de la habilidad (mensaje del Hypnotist, rol del Forger). */
      choice?: string | null;
      /** Nota de muerte del asesino (wiki: Death_Note_ToS.md:15, 400 caracteres). Solo la lleva un kill con deathNote. */
      note?: string | null;
      /** Testamento falsificado del Forger (wiki: Forger.md:204, 218). Vacío o ausente: el testamento se quita. */
      forgedWill?: string | null;
    }
  | { type: "night.action.cancel"; actorId: PlayerId }
  | { type: "will.write"; playerId: PlayerId; text: string }
  | { type: "chat.send"; senderId: PlayerId; channel: "public" | "mafia" | "dead" | "whisper" | "jail" | "seance"; text: string; recipientId?: PlayerId }
  | { type: "timer.expired" };
