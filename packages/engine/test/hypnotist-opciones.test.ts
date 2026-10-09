import { describe, expect, it } from "vitest";
import { game, ofType, rejected, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";
import { ROLE_HANDLERS } from "../src/roles/registry.js";

// Wiki (docs/roles/Hypnotist.md:232) "You were Transported to another location."
// Wiki (docs/roles/Hypnotist.md:238) "You were attacked but someone fought off your attacker!"
// Wiki (docs/roles/Hypnotist.md:254) "You triggered a trap!"
// Wiki (docs/roles/Hypnotist.md:256) "You were attacked but a trap saved you!"
// Wiki (docs/roles/Hypnotist.md:258) "A trap attacked you but someone nursed you back to health!"
// Wiki (docs/roles/Hypnotist.md:224): "If you don't choose a message, you cannot be controlled into visiting anyone."
//   SKIPPED: la frase presupone una acción válida sin opción; el motor exige opción (collect.ts) y no hay regla para
//   "sin mensaje, sin visita" en la wiki que se pueda implementar sin inventarla.

const night = (actorId: string, ability: string, targetId: string | null, choice: string | null = null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId: null, choice }) as const;

const OPTIONS = ["transported", "fought_off", "trap_triggered", "trap_saved", "trap_healed"] as const;

function resolve(state: GameState, actions: Array<ReturnType<typeof night>>) {
  let s = state;
  for (const a of actions) s = step(s, a).state;
  return step(s, timer());
}

describe("Hypnotist: opciones de mensaje del MVP (wiki: Hypnotist.md:232-258)", () => {
  for (const option of OPTIONS) {
    it(`el objetivo recibe el mensaje '${option}' en privado al terminar la noche`, () => {
      // p1 Hypnotist planta el mensaje en p3 (Investigator).
      const { events } = resolve(game(["hypnotist", "godfather", "investigator"]), [night("p1", "hypnotize", "p3", option)]);
      const msg = ofType(events, "hypnosis.message");
      expect(msg.map((e) => [e.payload.playerId, e.payload.message])).toEqual([["p3", option]]);
      expect(msg[0]!.visibility).toBe("private");
      expect(msg[0]!.audiencePlayerId).toBe("p3");
    });
  }

  it("una opción que no existe se rechaza y no envía ningún mensaje", () => {
    expect(rejected(game(["hypnotist", "investigator"]), night("p1", "hypnotize", "p2", "poisoned"))).toMatch(/Opción no válida/);
  });

  it("la lista de elección de la Hypnotist incluye las opciones del MVP", () => {
    const choices = ROLE_HANDLERS.get("hypnotist")!.nightAbilities[0]!.choices;
    expect(choices).toEqual(expect.arrayContaining([...OPTIONS]));
  });
});
