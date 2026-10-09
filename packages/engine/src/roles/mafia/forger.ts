import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Forger · Mafia · prioridad 3 · ficha: docs/roles/Forger.md
export const handler: RoleHandler = {
  key: "forger",
  name: "Forger",
  faction: "mafia",
  priority: 3,
  // Falsifica la última voluntad de un jugador: si muere, se muestra como el rol elegido. Dos usos.
  // Sin rol elegido, se guarda como Ambusher (wiki: Forger.md:242).
  nightAbilities: [{ key: "forge", target: "player", usesLimit: 2, choices: "roles", defaultChoice: "ambusher", writesWill: true }],
  dayAbilities: [],
  // Pendiente (wiki: Forger.md:240): si la noche acaba sin guardar, el rol por defecto es Forger; el motor no tiene
  // borrador, así que una falsificación sin guardar no existe. Retributionist y Necromancer usan el rol real aunque el
  // cadáver se muestre falsificado, y la wiki pide restringirlos (Forger.md:232, 234): no implementado.
  gaps: "Sin borrador: no hay default a Forger si no se guarda (Forger.md:240). Retributionist/Necromancer sobre cadáver falsificado (Forger.md:232, 234): no implementado.",
  resolveNight: ({ ability, actor, targetId, choice, forgedWill }): Effect[] => {
    if (ability !== "forge" || !targetId || !choice) return [];
    return [{ kind: "forge", actorId: actor.id, targetId, role: choice, will: forgedWill ?? "" }];
  },
};
