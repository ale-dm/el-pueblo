import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

// Wiki (docs/roles/Jailor.md:590): "You were executed by the Jailor!" — "Displays at the end of the night for the prisoner
// when they are successfully executed." Texto también en docs/wiki/Messages_ToS.md:1723.

const night = (actorId: string, ability: string, targetId: string | null, choice: string | null = null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId: null, choice }) as const;

const notices = (events: ReturnType<typeof step>["events"]) =>
  ofType(events, "night.notice").map((e) => [e.audiencePlayerId, e.payload.notice]);

function resolve(state: GameState, actions: Array<ReturnType<typeof night>>) {
  let s = state;
  for (const a of actions) s = step(s, a).state;
  return step(s, timer());
}

/** p1 Jailor encarcela a p3 (Investigator) en la noche 2. */
const jailed = () => {
  const s = game(["jailor", "godfather", "investigator"], { dayNumber: 2, jailedBy: { p3: "p1" } });
  s.players[2] = { ...s.players[2]!, flags: { jailed: true } };
  return s;
};

describe("Jailor: el prisionero ejecutado recibe su aviso (wiki: Jailor.md:590)", () => {
  it("el prisionero que el Jailor ejecuta recibe 'You were executed by the Jailor!' al amanecer", () => {
    const { events, state } = resolve(jailed(), [night("p1", "execute", "p3")]);
    expect(state.players[2]!.status).toBe("dead");
    expect(notices(events)).toContainEqual(["p3", "jailor_executed"]);
    expect(ofType(events, "night.notice").find((e) => e.payload.notice === "jailor_executed")!.visibility).toBe("private");
  });

  it("el Jailor que decide no ejecutar no envía el aviso de ejecución", () => {
    const { events, state } = resolve(jailed(), []);
    expect(state.players[2]!.status).toBe("alive");
    expect(notices(events).some(([, n]) => n === "jailor_executed")).toBe(false);
  });

  it("el aviso de ejecución no se envía a quien el Jailor no ejecutó", () => {
    const { events } = resolve(jailed(), [night("p1", "execute", "p3")]);
    expect(notices(events).filter(([, n]) => n === "jailor_executed").map(([who]) => who)).toEqual(["p3"]);
  });
});
