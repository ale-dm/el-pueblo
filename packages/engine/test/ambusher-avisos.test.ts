import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

// Wiki (docs/roles/Ambusher.md:222): "All visitors to your target will learn your name (even if Disguised). The message is:
// "You saw [Ambusher] prepare an ambush while visiting your target.""
// Wiki (docs/wiki/Messages_ToS.md:2117): "You saw (Player) prepare an ambush while visiting your target." — "Displays at the end
// of the night for a non-Mafia player visiting an Ambusher's target."
// Wiki (docs/wiki/Messages_ToS.md:2109): "You ambushed someone who visited your target last night!" — "Displays at the end of
// the Night if someone visits your target."
// Supuesto: el aviso de nombre va a los visitantes no Mafia (Messages_ToS.md:2117); la Mafia ya conoce al Ambusher.

const night = (actorId: string, ability: string, targetId: string | null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId: null, choice: null }) as const;

const notices = (events: ReturnType<typeof step>["events"]) =>
  ofType(events, "night.notice").map((e) => [e.audiencePlayerId, e.payload.notice, e.payload.subjectId]);

function resolve(state: GameState, actions: Array<ReturnType<typeof night>>) {
  let s = state;
  for (const a of actions) s = step(s, a).state;
  return step(s, timer());
}

describe("Ambusher: nombre revelado y avisos (wiki: Ambusher.md:222; Messages_ToS.md:2109, 2117)", () => {
  it("el visitante no Mafia del objetivo recibe 'You saw [Ambusher] prepare an ambush while visiting your target.'", () => {
    // p1 Ambusher acecha a p2; p3 Lookout visita a p2.
    const { events } = resolve(game(["ambusher", "investigator", "lookout"]), [night("p1", "ambush", "p2"), night("p3", "watch", "p2")]);
    expect(notices(events)).toContainEqual(["p3", "ambusher_seen", "p1"]);
  });

  it("todo visitante no Mafia recibe el nombre, aunque el Ambusher solo mate a uno", () => {
    // p1 Ambusher acecha a p2; p3 Lookout y p4 Sheriff visitan a p2.
    const { events } = resolve(game(["ambusher", "investigator", "lookout", "sheriff"]), [
      night("p1", "ambush", "p2"),
      night("p3", "watch", "p2"),
      night("p4", "interrogate", "p2"),
    ]);
    const seen = notices(events).filter(([, n]) => n === "ambusher_seen").map(([who]) => who);
    expect(seen.sort()).toEqual(["p3", "p4"]);
    expect(ofType(events, "player.killed").filter((e) => e.payload.cause === "ambush")).toHaveLength(1);
  });

  it("el visitante que muere también conoce el nombre del Ambusher", () => {
    const { events, state } = resolve(game(["ambusher", "investigator", "lookout"]), [night("p1", "ambush", "p2"), night("p3", "watch", "p2")]);
    expect(state.players[2]!.status).toBe("dead");
    expect(notices(events)).toContainEqual(["p3", "ambusher_seen", "p1"]);
  });

  it("un visitante de la Mafia no recibe el aviso de nombre", () => {
    // p1 Ambusher acecha a p2; p3 Godfather visita a p2 (mata a p2 con su propia orden); p4 Lookout visita a p2.
    const { events } = resolve(game(["ambusher", "investigator", "godfather", "lookout"]), [
      night("p1", "ambush", "p2"),
      night("p3", "kill", "p2"),
      night("p4", "watch", "p2"),
    ]);
    const seen = notices(events).filter(([, n]) => n === "ambusher_seen").map(([who]) => who);
    expect(seen).toEqual(["p4"]);
  });

  it("el Ambusher recibe 'You ambushed someone who visited your target last night!' al elegir a un visitante", () => {
    const { events } = resolve(game(["ambusher", "investigator", "lookout"]), [night("p1", "ambush", "p2"), night("p3", "watch", "p2")]);
    expect(notices(events)).toContainEqual(["p1", "ambush_attacked_visitor", undefined]);
  });

  it("sin visitantes, el Ambusher no recibe el aviso de emboscada ni nadie el de nombre", () => {
    const { events } = resolve(game(["ambusher", "investigator", "lookout"]), [night("p1", "ambush", "p2")]);
    expect(notices(events).some(([, n]) => n === "ambush_attacked_visitor" || n === "ambusher_seen")).toBe(false);
  });

  it("el Crusader que ataca no hace que los visitantes vean un Ambusher", () => {
    const { events } = resolve(game(["crusader", "investigator", "lookout"]), [night("p1", "protect", "p2"), night("p3", "watch", "p2")]);
    expect(notices(events).some(([, n]) => n === "ambusher_seen")).toBe(false);
  });
});
