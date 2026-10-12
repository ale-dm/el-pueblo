import { describe, expect, it } from "vitest";
import { game } from "./helpers/game.js";
import { endOf, withVictory } from "../src/phases/context.js";
import { TIMEOUT_FIRST_DAY } from "../src/rules/victory.js";
import type { EventInput } from "../src/types/events.js";

// Wiki (Victory_ToS.md:157): "A wipeout occurs when all players are dead." Factional roles get a draw.
// Wiki (Victory_ToS.md:13): "If there are no deaths in two consecutive Days late in the game, a draw by timeout will occur".
describe("empate: aniquilación y tiempo", () => {
  it("si mueren todos a la vez, es empate y no gana el pueblo", () => {
    const s = game(["mafioso", "sheriff"], { phase: "night", dayNumber: 3 });
    const dead = s.players.map((p) => ({ ...p, status: "dead" as const }));
    expect(endOf({ ...s, players: dead }, false)).toEqual({ winner: null });
  });

  it("antes del día 9 no hay empate por tiempo, aunque no muera nadie", () => {
    const s = game(["mafioso", "sheriff", "doctor"], { phase: "night", dayNumber: TIMEOUT_FIRST_DAY - 3, lastDeathDay: 0 });
    expect(endOf(s, true)).toBeNull();
  });

  it("desde el día 9, dos noches seguidas sin muertes al amanecer dan empate", () => {
    const s = game(["mafioso", "sheriff", "doctor"], { phase: "night", dayNumber: TIMEOUT_FIRST_DAY - 1, lastDeathDay: TIMEOUT_FIRST_DAY - 3 });
    expect(endOf(s, true)).toEqual({ winner: null });
  });

  it("una muerte en la última de esas dos noches evita el empate", () => {
    const s = game(["mafioso", "sheriff", "doctor"], { phase: "night", dayNumber: TIMEOUT_FIRST_DAY - 1, lastDeathDay: TIMEOUT_FIRST_DAY - 2 });
    expect(endOf(s, true)).toBeNull();
  });

  it("el empate por tiempo solo se comprueba al amanecer, no en medio del día", () => {
    const s = game(["mafioso", "sheriff", "doctor"], { phase: "voting", dayNumber: TIMEOUT_FIRST_DAY, lastDeathDay: 0 });
    expect(endOf(s, false)).toBeNull();
  });

  it("withVictory añade game.ended con winner null al empatar", () => {
    const s = game(["mafioso", "sheriff", "doctor"], { phase: "night", dayNumber: TIMEOUT_FIRST_DAY - 1, lastDeathDay: 0 });
    const inputs: EventInput[] = [];
    const out = withVictory(s, inputs, true);
    expect(out.at(-1)).toEqual({ type: "game.ended", payload: { winner: null } });
  });
});
