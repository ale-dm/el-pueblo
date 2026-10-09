import { describe, expect, it } from "vitest";
import { catalog, game, ofType, step, timer } from "./helpers/game.js";
import { checkVictory } from "../src/rules/victory.js";
import { ROLE_HANDLERS } from "../src/roles/registry.js";
import type { FactionKey } from "../src/types/factions.js";

/**
 * Victoria y derrota por rol (checklist d). Cada rol del MVP gana "con" su facción según la línea "Gana con"
 * de docs/roles/<Rol>.md: Town o Mafia. Survivor y Witch (también listados en "Gana con") no están en el MVP.
 * Condiciones 1 contra 1 de docs/wiki/Victory_ToS.md: el motor no las modela; van como SKIPPED.
 */
const MVP_WIN_FACTION: Array<{ key: string; faction: FactionKey }> = [
  { key: "ambusher", faction: "mafia" },      // docs/roles/Ambusher.md · Gana con: Mafia
  { key: "blackmailer", faction: "mafia" },   // docs/roles/Blackmailer.md
  { key: "bodyguard", faction: "town" },      // docs/roles/Bodyguard.md · Gana con: Town
  { key: "bootlegger", faction: "mafia" },    // docs/roles/Bootlegger.md
  { key: "consigliere", faction: "mafia" },   // docs/roles/Consigliere.md
  { key: "crusader", faction: "town" },       // docs/roles/Crusader.md
  { key: "disguiser", faction: "mafia" },     // docs/roles/Disguiser.md
  { key: "doctor", faction: "town" },         // docs/roles/Doctor.md
  { key: "forger", faction: "mafia" },        // docs/roles/Forger.md
  { key: "framer", faction: "mafia" },        // docs/roles/Framer.md
  { key: "godfather", faction: "mafia" },     // docs/roles/Godfather.md
  { key: "hypnotist", faction: "mafia" },     // docs/roles/Hypnotist.md
  { key: "investigator", faction: "town" },   // docs/roles/Investigator.md
  { key: "jailor", faction: "town" },         // docs/roles/Jailor.md
  { key: "janitor", faction: "mafia" },       // docs/roles/Janitor.md
  { key: "lookout", faction: "town" },        // docs/roles/Lookout.md
  { key: "mafioso", faction: "mafia" },       // docs/roles/Mafioso.md
  { key: "mayor", faction: "town" },          // docs/roles/Mayor.md
  { key: "medium", faction: "town" },         // docs/roles/Medium.md
  { key: "psychic", faction: "town" },        // docs/roles/Psychic.md
  { key: "retributionist", faction: "town" }, // docs/roles/Retributionist.md
  { key: "sheriff", faction: "town" },        // docs/roles/Sheriff.md
  { key: "spy", faction: "town" },            // docs/roles/Spy.md
  { key: "tavern_keeper", faction: "town" },  // docs/roles/Tavern_Keeper.md
  { key: "tracker", faction: "town" },        // docs/roles/Tracker.md
  { key: "transporter", faction: "town" },    // docs/roles/Transporter.md
  { key: "trapper", faction: "town" },        // docs/roles/Trapper.md
  { key: "veteran", faction: "town" },        // docs/roles/Veteran.md
  { key: "vigilante", faction: "town" },      // docs/roles/Vigilante.md
];

const other = (f: FactionKey): FactionKey => (f === "town" ? "mafia" : "town");
/** Un jugador de la facción contraria, para completar la partida. */
const opponentRole = (f: FactionKey) => (f === "town" ? "godfather" : "investigator");

/** Partida de dos jugadores: el rol (p1) y un oponente (p2). Termina la noche; devuelve el ganador y el estado. */
function endNight(roleAlive: boolean, opponentAlive: boolean, role: string) {
  const s = game([role, opponentRole(ROLE_HANDLERS.get(role)!.faction)]);
  s.players[0] = { ...s.players[0]!, status: roleAlive ? "alive" : "dead" };
  s.players[1] = { ...s.players[1]!, status: opponentAlive ? "alive" : "dead" };
  const { events } = step(s, timer());
  const ended = ofType(events, "game.ended")[0];
  return { winner: ended?.payload.winner ?? null, state: s };
}

describe("victoria y derrota por rol (checklist d)", () => {
  it("la tabla cubre los 29 roles del MVP del catálogo y cada uno tiene su facción", () => {
    const mvp = [...catalog.roles.values()].filter((r) => r.mvp).map((r) => r.key).sort();
    expect(MVP_WIN_FACTION.map((r) => r.key).sort()).toEqual(mvp);
    for (const { key, faction } of MVP_WIN_FACTION) {
      expect(catalog.roles.get(key)?.faction, key).toBe(faction);
      expect(ROLE_HANDLERS.get(key)?.faction, key).toBe(faction);
    }
  });

  describe.each(MVP_WIN_FACTION)("$key ($faction)", ({ key, faction }) => {
    it("gana con su facción: el rol está vivo y la facción contraria ha desaparecido", () => {
      const { winner, state } = endNight(true, false, key);
      expect(winner).toBe(faction);
      expect(checkVictory(state.players)).toBe(faction);
      const roleWon = state.players[0]!.faction === winner;
      expect(roleWon).toBe(true);
    });

    it("pierde si gana la facción contraria: el rol está muerto y queda la otra facción", () => {
      const { winner, state } = endNight(false, true, key);
      expect(winner).toBe(other(faction));
      expect(checkVictory(state.players)).toBe(other(faction));
      expect(state.players[0]!.faction === winner).toBe(false);
    });
  });

  // Condiciones 1 contra 1 de la wiki (docs/wiki/Victory_ToS.md, "Town Victory" y "Mafia Victory"): el motor
  // solo cuenta jugadores vivos por facción; no hay regla 1 contra 1. SKIPPED con cita.
  it.skip("Transporter: gana 1 contra 1 solo frente al Mafioso (docs/wiki/Victory_ToS.md, Town Victory)", () => {});
  it.skip("Godfather: gana automáticamente frente a un Transporter (docs/wiki/Victory_ToS.md, Mafia Victory)", () => {});
  it.skip("Mafia: un miembro gana 1 contra 1 frente a Tavern Keeper o Jailor sin ejecuciones (docs/wiki/Victory_ToS.md, Mafia Victory)", () => {});
});
