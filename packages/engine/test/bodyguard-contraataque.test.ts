import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

// Contraataque del Bodyguard: quién impide que muera.
// Wiki (docs/roles/Bodyguard.md:260): "Only Doctors, Potion Masters, Crusaders, and Guardian Angels can prevent a Bodyguard
// from dying in a counterattack, since those roles directly give their target Powerful Defense from all attacks."
// Wiki (docs/roles/Bodyguard.md:304): "A Doctor, Crusader, Potion Master or a Guardian Angel can prevent you or the attacker from dying."
// Wiki (docs/roles/Doctor.md:217): "You can heal a Bodyguard who was supposed to die protecting someone. This makes it so only
// the attacker dies. This also applies if the attacker is healed and the Bodyguard is not."
// Wiki (docs/roles/Bodyguard.md:306): "Being healed while counterattacking does not allow you to counter more than one attack on your target."
const night = (actorId: string, ability: string, targetId: string | null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId: null }) as const;

/** Resuelve la noche con las acciones dadas. */
function resolve(state: GameState, actions: Array<ReturnType<typeof night>>) {
  let s = state;
  for (const a of actions) s = step(s, a).state;
  return step(s, timer());
}

/** Vivos al final de la noche. */
const alive = (s: GameState) => s.players.filter((p) => p.status === "alive").map((p) => p.id);

/** Avisos privados: [a quién, aviso]. */
const notices = (events: ReturnType<typeof step>["events"]) =>
  ofType(events, "night.notice").map((e) => [e.audiencePlayerId, e.payload.notice]);

describe("Bodyguard: contraataque y quién lo impide (wiki: Bodyguard.md:260, 304)", () => {
  it("un Doctor que cura al Bodyguard impide que muera; el atacante sí muere (Bodyguard.md:260; Doctor.md:217)", () => {
    // p1 Bodyguard protege a p4; p2 Doctor cura a p1; p3 Godfather ataca a p4.
    const s = game(["bodyguard", "doctor", "godfather", "investigator"]);
    const { state, events } = resolve(s, [night("p1", "protect", "p4"), night("p2", "heal", "p1"), night("p3", "kill", "p4")]);
    expect(alive(state)).toEqual(["p1", "p2", "p4"]);
    expect(state.players.find((p) => p.id === "p3")!.status).toBe("dead");
    expect(notices(events)).toContainEqual(["p1", "healed"]);
    expect(notices(events)).toContainEqual(["p2", "target_attacked"]);
  });

  it("un Doctor que cura al atacante lo salva; el Bodyguard muere protegiendo (Doctor.md:217; Bodyguard.md:304)", () => {
    // p1 Bodyguard protege a p4; p2 Doctor cura a p3 (Godfather); p3 ataca a p4.
    const s = game(["bodyguard", "doctor", "godfather", "investigator"]);
    const { state, events } = resolve(s, [night("p1", "protect", "p4"), night("p2", "heal", "p3"), night("p3", "kill", "p4")]);
    expect(alive(state)).toEqual(["p2", "p3", "p4"]);
    expect(state.players.find((p) => p.id === "p1")!.status).toBe("dead");
    expect(state.players.find((p) => p.id === "p1")!.deathReason).toBe("guarding");
    expect(notices(events)).toContainEqual(["p3", "healed"]);
    expect(notices(events)).toContainEqual(["p2", "target_attacked"]);
  });

  it("si cura a los dos, no muere nadie (Bodyguard.md:304; Doctor.md:217)", () => {
    // p1 Bodyguard protege a p5; p2 Doctor cura a p1; p3 Doctor cura a p4 (Godfather); p4 ataca a p5.
    const s = game(["bodyguard", "doctor", "doctor", "godfather", "investigator"]);
    const { state } = resolve(s, [night("p1", "protect", "p5"), night("p2", "heal", "p1"), night("p3", "heal", "p4"), night("p4", "kill", "p5")]);
    expect(alive(state)).toEqual(["p1", "p2", "p3", "p4", "p5"]);
  });

  it("un Crusader que protege al Bodyguard también le impide morir (Bodyguard.md:260; Crusader.md:214)", () => {
    // p1 Bodyguard protege a p4; p2 Crusader protege a p1; p3 Godfather ataca a p4.
    const s = game(["bodyguard", "crusader", "godfather", "investigator"]);
    const { state } = resolve(s, [night("p1", "protect", "p4"), night("p2", "protect", "p1"), night("p3", "kill", "p4")]);
    expect(state.players.find((p) => p.id === "p1")!.status).toBe("alive");
    expect(state.players.find((p) => p.id === "p3")!.status).toBe("dead");
    expect(alive(state)).toContain("p4");
  });

  it("sin cura, el Bodyguard sigue muriendo con su atacante (Bodyguard.md:210)", () => {
    const s = game(["bodyguard", "godfather", "investigator"]);
    const { state } = resolve(s, [night("p1", "protect", "p3"), night("p2", "kill", "p3")]);
    expect(state.players.find((p) => p.id === "p1")!.status).toBe("dead");
    expect(state.players.find((p) => p.id === "p2")!.status).toBe("dead");
    expect(alive(state)).toContain("p3");
  });

  it("un Bodyguard curado cuenta un solo contraataque: el segundo atacante ya no se encuentra con el Bodyguard (Bodyguard.md:306)", () => {
    // p1 Bodyguard protege a p5 y lo cura p2 Doctor. p3 Vigilante dispara a p5 (su disparo va primero); p4 Godfather ataca a p5.
    // El Bodyguard contraataca al Vigilante y sobrevive; el ataque de la Mafia ya no se contraataca y mata a p5.
    const s = game(["bodyguard", "doctor", "vigilante", "godfather", "investigator"], { dayNumber: 2 });
    const { state } = resolve(s, [
      night("p1", "protect", "p5"),
      night("p2", "heal", "p1"),
      night("p3", "shoot", "p5"),
      night("p4", "kill", "p5"),
    ]);
    expect(state.players.find((p) => p.id === "p3")!.status).toBe("dead");
    expect(state.players.find((p) => p.id === "p1")!.status).toBe("alive");
    expect(state.players.find((p) => p.id === "p4")!.status).toBe("alive");
    expect(state.players.find((p) => p.id === "p5")!.status).toBe("dead");
  });
});

describe("Doctor: aviso al curar a un protegido por el Bodyguard (wiki: Doctor.md:259)", () => {
  it("el Doctor recibe 'Your target was attacked last night!' y el protegido no recibe 'healed' (Doctor.md:259)", () => {
    // p1 Bodyguard protege a p4; p2 Doctor cura a p4; p3 Godfather ataca a p4. El Bodyguard salva a p4.
    const s = game(["bodyguard", "doctor", "godfather", "investigator"]);
    const { events } = resolve(s, [night("p1", "protect", "p4"), night("p2", "heal", "p4"), night("p3", "kill", "p4")]);
    expect(notices(events)).toContainEqual(["p2", "target_attacked"]);
    expect(notices(events)).toContainEqual(["p4", "bodyguard_saved"]);
    expect(notices(events).some(([, n]) => n === "healed")).toBe(false);
  });
});
