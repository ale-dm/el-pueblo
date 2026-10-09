import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

// Wiki (docs/roles/Doctor.md:249): "You will be notified if your target was attacked in any way, shape, or form."
// Wiki (docs/roles/Doctor.md:269): "If someone is successfully healed, their attacker will receive the message
// "Your target's defense was too strong to kill.", which is the same as if they had attacked a role with Defense."
// Wiki (docs/roles/Doctor.md:229): "Healing someone gives them temporary Powerful Defense, so the attacker will receive
// an immunity message."

const night = (actorId: string, ability: string, targetId: string | null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId: null }) as const;

const notices = (events: ReturnType<typeof step>["events"]) =>
  ofType(events, "night.notice").map((e) => [e.audiencePlayerId, e.payload.notice]);

function resolve(state: GameState, actions: Array<ReturnType<typeof night>>) {
  let s = state;
  for (const a of actions) s = step(s, a).state;
  return step(s, timer());
}

describe("Doctor: la defensa de su objetivo llega a cualquier atacante (wiki: Doctor.md:229, 269)", () => {
  it("el Vigilante cuyo disparo frena el Doctor recibe 'Your target's defense was too strong to kill.'", () => {
    // p1 Vigilante dispara a p3; p2 Doctor cura a p3. Noche 2 para que el Vigilante ya pueda disparar.
    const { events, state } = resolve(game(["vigilante", "doctor", "investigator"], { dayNumber: 2 }), [night("p1", "shoot", "p3"), night("p2", "heal", "p3")]);
    expect(state.players[2]!.status).toBe("alive");
    expect(notices(events)).toContainEqual(["p1", "target_defense"]);
    expect(notices(events)).toContainEqual(["p3", "healed"]);
  });

  it("el Mafioso que ejecuta la orden del Godfather recibe el aviso si el Doctor frena; el Godfather no (Godfather.md:233)", () => {
    // p1 Godfather ordena a p3; p2 Mafioso ejecuta; p4 Doctor cura a p3.
    const { events } = resolve(game(["godfather", "mafioso", "investigator", "doctor"]), [night("p1", "kill", "p3"), night("p4", "heal", "p3")]);
    expect(notices(events)).toContainEqual(["p2", "target_defense"]);
    expect(notices(events).some(([who, n]) => who === "p1" && n === "target_defense")).toBe(false);
    expect(notices(events).some(([who, n]) => who === "p1" && n === "godfather_target_defense")).toBe(false);
  });

  it("el Godfather que ataca él mismo sigue recibiendo su aviso propio, sin duplicarlo", () => {
    const { events } = resolve(game(["godfather", "investigator", "doctor"]), [night("p1", "kill", "p2"), night("p3", "heal", "p2")]);
    expect(notices(events)).toContainEqual(["p1", "godfather_target_defense"]);
    expect(notices(events).some(([who, n]) => who === "p1" && n === "target_defense")).toBe(false);
  });

  it("un ataque que nadie frena no da el aviso de defensa", () => {
    const { events, state } = resolve(game(["vigilante", "investigator", "doctor"], { dayNumber: 2 }), [night("p1", "shoot", "p2")]);
    expect(state.players[1]!.status).toBe("dead");
    expect(notices(events).some(([, n]) => n === "target_defense")).toBe(false);
  });
});
