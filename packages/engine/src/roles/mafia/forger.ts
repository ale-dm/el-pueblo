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
  // borrador, así que una falsificación sin guardar no existe. El Retributionist sí se limita con el rol falsificado
  // (Forger.md:232, retributionist.ts). Necromancer (no MVP) no se implementa (Forger.md:234).
  gaps: "Sin borrador: no hay default a Forger si no se guarda (Forger.md:240). Necromancer sobre cadáver falsificado (Forger.md:234): fuera de MVP.",
  resolveNight: ({ ability, actor, targetId, choice, forgedWill }): Effect[] => {
    if (ability !== "forge" || !targetId || !choice) return [];
    return [{ kind: "forge", actorId: actor.id, targetId, role: choice, will: forgedWill ?? "" }];
  },
};
