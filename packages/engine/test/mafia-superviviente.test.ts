import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

// Wiki (docs/roles/Godfather.md:487; docs/roles/Mafioso.md:475): "You were attacked by a member of the Mafia!" —
// "Displays at the end of the night when you are attacked by a Mafia Killing role."
// Wiki (docs/wiki/Mafia_Killing.md:13, 15): lo mismo para el Ambusher ("You were attacked by a member of the Mafia!").
// Solo el superviviente lo recibe; el muerto tiene su aviso de muerte.

const night = (actorId: string, ability: string, targetId: string | null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId: null, choice: null }) as const;

const notices = (events: ReturnType<typeof step>["events"]) =>
  ofType(events, "night.notice").map((e) => [e.audiencePlayerId, e.payload.notice]);

function resolve(state: GameState, actions: Array<ReturnType<typeof night>>) {
  let s = state;
  for (const a of actions) s = step(s, a).state;
  return step(s, timer());
}

describe("Mafia: aviso al superviviente de un ataque de la Mafia (wiki: Godfather.md:487; Mafioso.md:475)", () => {
  it("el atacado por el Godfather que el Doctor cura sobrevive y recibe el aviso de la Mafia", () => {
    const { events, state } = resolve(game(["godfather", "investigator", "doctor"]), [night("p1", "kill", "p2"), night("p3", "heal", "p2")]);
    expect(state.players[1]!.status).toBe("alive");
    expect(notices(events)).toContainEqual(["p2", "mafia_attacked_you"]);
  });

  it("el atacado por la Mafia que muere no recibe el aviso de superviviente", () => {
    const { events, state } = resolve(game(["godfather", "investigator"]), [night("p1", "kill", "p2")]);
    expect(state.players[1]!.status).toBe("dead");
    expect(notices(events).some(([, n]) => n === "mafia_attacked_you")).toBe(false);
  });

  it("el atacado por la Mafia que salva el Bodyguard sobrevive y recibe el aviso", () => {
    // p2 Bodyguard protege a p3; p1 Godfather ataca a p3.
    const { events, state } = resolve(game(["godfather", "bodyguard", "investigator"]), [night("p2", "protect", "p3"), night("p1", "kill", "p3")]);
    expect(state.players[2]!.status).toBe("alive");
    expect(notices(events)).toContainEqual(["p3", "mafia_attacked_you"]);
  });

  it("el visitante que el Ambusher ataca y el Doctor cura recibe el aviso de la Mafia", () => {
    // p1 Ambusher acecha a p2; p3 Lookout visita a p2 y es el visitante elegido; p4 Doctor cura a p3.
    const { events, state } = resolve(game(["ambusher", "investigator", "lookout", "doctor"]), [
      night("p1", "ambush", "p2"),
      night("p3", "watch", "p2"),
      night("p4", "heal", "p3"),
    ]);
    expect(state.players[2]!.status).toBe("alive");
    expect(notices(events)).toContainEqual(["p3", "mafia_attacked_you"]);
  });

  it("el atacado por un Vigilante no recibe el aviso de la Mafia", () => {
    // Noche 2 para que el Vigilante ya pueda disparar; el Doctor cura al objetivo.
    const { events } = resolve(game(["vigilante", "investigator", "doctor"], { dayNumber: 2 }), [night("p1", "shoot", "p2"), night("p3", "heal", "p2")]);
    expect(notices(events).some(([, n]) => n === "mafia_attacked_you")).toBe(false);
  });
});
