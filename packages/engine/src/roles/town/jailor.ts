import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

/**
 * Razones de la nota del Jailor (wiki: Death_Note_ToS.md:76-88; Jailor.md:308-320). Son varias casillas: se marcan
 * una o más, y no pueden quedar todas sin marcar (Jailor.md:322).
 */
export const JAILOR_REASONS = ["no_reason", "evildoer", "contradictory", "possessed", "quiet", "outsider", "discretion"] as const;

/** Sin elegir, "No reason specified" queda marcada (Jailor.md:322; Death_Note_ToS.md:90). */
export const jailorReasons = (choice: string | null): string[] => (choice ? choice.split(",") : ["no_reason"]);

// Jailor · Town · prioridad 1 · ficha: docs/roles/Jailor.md
export const handler: RoleHandler = {
  key: "jailor",
  name: "Jailor",
  faction: "town",
  priority: 1,
  nightAbilities: [{ key: "execute", target: "player", usesLimit: 3, multiChoices: JAILOR_REASONS }],
  dayAbilities: [{ key: "jail", target: "player", oncePerDay: true, usesLimit: null }],
  resolveNight: ({ ability, actor, targetId, choice }): Effect[] => {
    switch (ability) {
      // Ejecutar es un ataque imparable (wiki: Jailor, "Executing your target deals them an Unstoppable Attack").
      // La nota del Jailor acompaña a la ejecución (Death_Note_ToS.md:92: "to confirm to the Town why you executed").
      case "execute": return targetId ? [{ kind: "attack", actorId: actor.id, targetId, power: 2, cause: "execute", unstoppable: true, reasons: jailorReasons(choice) }] : [];
      default: return [];
    }
  },
};
