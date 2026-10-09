import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

// Wiki (docs/roles/Crusader.md:216): "If your target is attacked, the message "You were attacked but someone protected you!"
// will appear to them. You will receive the message "Your target was attacked last night!""
// Wiki (docs/wiki/Messages_ToS.md:1865, 1873): "Your target was attacked last night!" (Crusader) y
// "You were attacked but someone protected you!" (al protegido).
// Wiki (docs/roles/Crusader.md:330, 336; Messages_ToS.md:1861, 1869): "You were attacked by a Crusader!" (visitante que
// sobrevive) y "You attacked someone visiting your target!" (el Crusader que ataca a un visitante).

const night = (actorId: string, ability: string, targetId: string | null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId: null }) as const;

const notices = (events: ReturnType<typeof step>["events"]) =>
  ofType(events, "night.notice").map((e) => [e.audiencePlayerId, e.payload.notice]);

function resolve(state: GameState, actions: Array<ReturnType<typeof night>>) {
  let s = state;
  for (const a of actions) s = step(s, a).state;
  return step(s, timer());
}

describe("Crusader: aviso de atacado al Crusader (wiki: Crusader.md:216; Messages_ToS.md:1865)", () => {
  it("el Crusader recibe 'Your target was attacked last night!' cuando su objetivo es atacado y protegido", () => {
    // p1 Godfather ataca a p2; p3 Crusader protege a p2.
    const { events, state } = resolve(game(["godfather", "investigator", "crusader"]), [night("p1", "kill", "p2"), night("p3", "protect", "p2")]);
    expect(state.players[1]!.status).toBe("alive");
    expect(notices(events)).toContainEqual(["p3", "target_attacked"]);
  });

  it("el Crusader no recibe el aviso si el ataque va a otro jugador, no a su objetivo", () => {
    // p1 Godfather ataca a p2; p3 Crusader protege a p4.
    const { events } = resolve(game(["godfather", "investigator", "crusader", "sheriff"]), [night("p1", "kill", "p2"), night("p3", "protect", "p4")]);
    expect(notices(events).some(([who, n]) => who === "p3" && n === "target_attacked")).toBe(false);
  });

  it("sin ataque al objetivo, el Crusader no recibe el aviso", () => {
    const { events } = resolve(game(["godfather", "investigator", "crusader"]), [night("p3", "protect", "p2")]);
    expect(notices(events).some(([, n]) => n === "target_attacked")).toBe(false);
  });

  it("el Crusader recibe un solo aviso aunque su objetivo sea atacado dos veces", () => {
    // p1 Godfather y p4 Vigilante disparan a p2 (protegido por p3 Crusader). Vigilante en noche 2 para poder disparar.
    const { events } = resolve(game(["godfather", "investigator", "crusader", "vigilante"], { dayNumber: 2 }), [
      night("p1", "kill", "p2"),
      night("p4", "shoot", "p2"),
      night("p3", "protect", "p2"),
    ]);
    expect(notices(events).filter(([who, n]) => who === "p3" && n === "target_attacked")).toHaveLength(1);
  });
});

describe("Crusader: aviso al protegido atacado (wiki: Crusader.md:216; Messages_ToS.md:1873)", () => {
  it("el protegido atacado recibe 'You were attacked but someone protected you!' y sigue vivo", () => {
    const { events, state } = resolve(game(["godfather", "investigator", "crusader"]), [night("p1", "kill", "p2"), night("p3", "protect", "p2")]);
    expect(state.players[1]!.status).toBe("alive");
    expect(notices(events)).toContainEqual(["p2", "crusader_protected"]);
    expect(notices(events).some(([who, n]) => who === "p2" && n === "healed")).toBe(false);
  });

  it("sin ataque, el protegido no recibe aviso de protección", () => {
    const { events } = resolve(game(["godfather", "investigator", "crusader"]), [night("p3", "protect", "p2")]);
    expect(notices(events).some(([, n]) => n === "crusader_protected")).toBe(false);
  });
});

describe("Crusader: avisos a los visitantes (wiki: Crusader.md:330, 336; Messages_ToS.md:1861, 1869)", () => {
  it("el visitante que sobrevive al ataque del Crusader recibe 'You were attacked by a Crusader!'", () => {
    // p1 Godfather visita a p2 (Basic Defense: sobrevive al ataque Basic del Crusader). p3 Crusader protege a p2.
    const { events, state } = resolve(game(["godfather", "investigator", "crusader"]), [night("p1", "kill", "p2"), night("p3", "protect", "p2")]);
    expect(state.players[0]!.status).toBe("alive");
    expect(notices(events)).toContainEqual(["p1", "crusader_attacked_you"]);
  });

  it("el visitante que muere a manos del Crusader no recibe el aviso de sobrevivir", () => {
    // p1 Lookout visita a p2 (sin defensa): el Crusader le ataca y muere.
    const { events, state } = resolve(game(["lookout", "investigator", "crusader"]), [night("p1", "watch", "p2"), night("p3", "protect", "p2")]);
    expect(state.players[0]!.status).toBe("dead");
    expect(notices(events).some(([, n]) => n === "crusader_attacked_you")).toBe(false);
  });

  it("el Crusader que ataca a un visitante recibe 'You attacked someone visiting your target!'", () => {
    // p1 Lookout visita a p2; p3 Crusader protege a p2 y ataca a su visitante (p1).
    const { events } = resolve(game(["lookout", "investigator", "crusader"]), [night("p1", "watch", "p2"), night("p3", "protect", "p2")]);
    expect(notices(events)).toContainEqual(["p3", "crusader_attacked_visitor"]);
  });

  it("sin visitantes, el Crusader no recibe el aviso de ataque a visitante", () => {
    const { events } = resolve(game(["investigator", "crusader", "godfather"]), [night("p2", "protect", "p1")]);
    expect(notices(events).some(([, n]) => n === "crusader_attacked_visitor")).toBe(false);
  });

  it("el Ambusher que ataca a un visitante no hace que el Crusader reciba el aviso de visitante", () => {
    // p1 Ambusher acecha a p3; p4 Lookout visita a p3 y el Ambusher le mata. p2 Crusader protege a p5, sin visitantes.
    const { events } = resolve(game(["ambusher", "crusader", "investigator", "lookout", "sheriff"]), [
      night("p1", "ambush", "p3"),
      night("p4", "watch", "p3"),
      night("p2", "protect", "p5"),
    ]);
    expect(ofType(events, "player.killed").map((e) => [e.payload.playerId, e.payload.cause])).toContainEqual(["p4", "ambush"]);
    expect(notices(events).some(([, n]) => n === "crusader_attacked_visitor")).toBe(false);
  });
});
