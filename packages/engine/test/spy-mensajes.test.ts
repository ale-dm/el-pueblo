import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

// Wiki (docs/roles/Spy.md:219-309): mensajes que ve el Spy al espiar a su objetivo. Un mensaje por acción directa.
// Lo que no tiene mensaje en esa tabla queda sin mensaje (ver ROLES_STATUS.md, lote 9, K3).
const night = (actorId: string, ability: string, targetId: string | null, secondTargetId: string | null = null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId }) as const;

/** Resultados del espionaje: [quién espía, objetivo, claves de mensaje]. */
const spyResults = (events: ReturnType<typeof step>["events"]) =>
  ofType(events, "investigation.result")
    .filter((e) => e.payload.check === "bug")
    .map((e) => [e.payload.investigatorId, e.payload.targetId, e.payload.result]);

function resolve(state: GameState, actions: Array<ReturnType<typeof night>>) {
  let s = state;
  for (const a of actions) s = step(s, a).state;
  return step(s, timer());
}

describe("Spy: mensajes del espionaje, uno por acción directa (wiki: Spy.md:221-309)", () => {
  it("transporte: 'Your target was Transported to another location.' (Spy.md:225)", () => {
    // p1 Spy espía a p3; p2 Transporter cambia p3 con p4: el Spy recibe la información de p4 (Spy.md:207).
    const s = game(["spy", "transporter", "investigator", "investigator"]);
    const { events } = resolve(s, [night("p1", "bug", "p3"), night("p2", "transport", "p3", "p4")]);
    expect(spyResults(events)).toEqual([["p1", "p4", "transport"]]);
  });

  it("bloqueo: 'Someone occupied your target's night. They were role blocked!' (Spy.md:227)", () => {
    const s = game(["spy", "tavern_keeper", "investigator"]);
    const { events } = resolve(s, [night("p1", "bug", "p3"), night("p2", "distract", "p3")]);
    expect(spyResults(events)).toEqual([["p1", "p3", "block"]]);
  });

  it("bloqueo a inmune: 'Someone tried to role block your target but they were immune!' (Spy.md:263)", () => {
    // p3 Veteran es inmune a bloqueos (Tavern_Keeper.md:205).
    const s = game(["spy", "tavern_keeper", "veteran"]);
    const { events } = resolve(s, [night("p1", "bug", "p3"), night("p2", "distract", "p3")]);
    expect(spyResults(events)).toEqual([["p1", "p3", "block_immune"]]);
  });

  it("chantaje: 'Someone threatened to reveal your target's secrets. They were blackmailed!' (Spy.md:229)", () => {
    const s = game(["spy", "blackmailer", "investigator"]);
    const { events } = resolve(s, [night("p1", "bug", "p3"), night("p2", "blackmail", "p3")]);
    expect(spyResults(events)).toEqual([["p1", "p3", "blackmail"]]);
  });

  it("ataque de la Mafia que mata: 'Your target was attacked by a member of the Mafia!' (Spy.md:239)", () => {
    const s = game(["spy", "godfather", "investigator"]);
    const { events, state } = resolve(s, [night("p1", "bug", "p3"), night("p2", "kill", "p3")]);
    expect(state.players[2]!.status).toBe("dead");
    expect(spyResults(events)).toEqual([["p1", "p3", "attack_mafia"]]);
  });

  it("ataque de la Mafia curado: 'Your target was attacked but someone nursed them back to health!' (Spy.md:237)", () => {
    const s = game(["spy", "godfather", "investigator", "doctor"]);
    const { events } = resolve(s, [night("p1", "bug", "p3"), night("p2", "kill", "p3"), night("p4", "heal", "p3")]);
    expect(spyResults(events)).toEqual([["p1", "p3", "attack_healed"]]);
  });

  it("ataque parado por el Bodyguard: 'Your target was attacked but someone fought off their attacker!' (Spy.md:235)", () => {
    // p4 Bodyguard protege a p3; el Godfather muere al contraatacar.
    const s = game(["spy", "godfather", "investigator", "bodyguard"]);
    const { events } = resolve(s, [night("p1", "bug", "p3"), night("p2", "kill", "p3"), night("p4", "protect", "p3")]);
    expect(spyResults(events)).toEqual([["p1", "p3", "attack_fought_off"]]);
  });

  it("ataque parado por el chaleco: 'Your target was attacked but their bulletproof vest saved them!' (Spy.md:271)", () => {
    // p3 Bodyguard se pone el chaleco y lo bugea el Spy; el Godfather lo ataca.
    const s = game(["spy", "godfather", "bodyguard"]);
    const { events } = resolve(s, [night("p1", "bug", "p3"), night("p2", "kill", "p3"), night("p3", "vest", null)]);
    expect(spyResults(events)).toEqual([["p1", "p3", "attack_vest"]]);
  });

  it("ataque parado por la alerta: 'Someone tried to attack your alert target and failed!' (Spy.md:273)", () => {
    const s = game(["spy", "godfather", "veteran"]);
    const { events } = resolve(s, [night("p1", "bug", "p3"), night("p2", "kill", "p3"), night("p3", "alert", null)]);
    expect(spyResults(events)).toEqual([["p1", "p3", "attack_alert"]]);
  });

  it("ataque parado por la defensa del propio objetivo (Godfather): 'Someone attacked your target but their Defense was too strong!' (Spy.md:261)", () => {
    // p3 Godfather tiene Basic Defense: el Mafioso (ataque Basic) no le mata.
    const s = game(["spy", "mafioso", "godfather"]);
    const { events } = resolve(s, [night("p1", "bug", "p3"), night("p2", "kill", "p3")]);
    expect(spyResults(events)).toEqual([["p1", "p3", "attack_defense"]]);
  });

  it("disparo del Vigilante que mata: 'Your target was shot by a Vigilante!' (Spy.md:243)", () => {
    const s = game(["spy", "vigilante", "investigator"], { dayNumber: 2 });
    const { events } = resolve(s, [night("p1", "bug", "p3"), night("p2", "shoot", "p3")]);
    expect(spyResults(events)).toEqual([["p1", "p3", "attack_shot"]]);
  });

  it("visitante que mata el Veteran: 'Your target was shot by the Veteran they visited!' (Spy.md:247)", () => {
    // p3 visita al Veteran p2 que está en alerta.
    const s = game(["spy", "veteran", "investigator"]);
    const { events } = resolve(s, [night("p1", "bug", "p3"), night("p2", "alert", null), night("p3", "investigate", "p2")]);
    expect(spyResults(events)).toEqual([["p1", "p3", "attack_veteran"]]);
  });

  it("Bodyguard que muere protegiendo: 'Your target was killed protecting someone!' (Spy.md:249)", () => {
    // p3 Bodyguard protege a p4 del Godfather; ambos mueren.
    const s = game(["spy", "godfather", "bodyguard", "investigator"]);
    const { events } = resolve(s, [night("p1", "bug", "p3"), night("p2", "kill", "p4"), night("p3", "protect", "p4")]);
    expect(spyResults(events)).toEqual([["p1", "p3", "killed_guarding"]]);
  });

  it("atacante muerto por el Bodyguard: 'Your target was killed by a Bodyguard!' (Spy.md:259)", () => {
    const s = game(["spy", "godfather", "bodyguard", "investigator"]);
    const { events } = resolve(s, [night("p1", "bug", "p2"), night("p2", "kill", "p4"), night("p3", "protect", "p4")]);
    expect(spyResults(events)).toEqual([["p1", "p2", "killed_by_bodyguard"]]);
  });

  it("Vigilante que muere por la culpa: 'Your target shot themselves over the guilt of killing a town member!' (Spy.md:275)", () => {
    const s = game(["spy", "vigilante", "investigator"]);
    s.players[1] = { ...s.players[1]!, flags: { guilty: true } };
    const { events } = resolve(s, [night("p1", "bug", "p2")]);
    expect(spyResults(events)).toEqual([["p1", "p2", "killed_guilt"]]);
  });

  it("sin acción directa contra el objetivo no hay mensaje", () => {
    const s = game(["spy", "investigator", "godfather"]);
    const { events } = resolve(s, [night("p1", "bug", "p2")]);
    expect(spyResults(events)).toEqual([["p1", "p2", "nada"]]);
  });
});

describe("Spy: la trampa no tiene mensaje en su tabla (wiki: Spy.md:221-309; Messages_ToS.md:1655)", () => {
  it("ataque parado por la trampa: se conserva la clave anterior, no 'nada' (SKIPPED en ROLES_STATUS)", () => {
    // p4 Trapper tiene su trampa lista en p3 (Trapper.md:159); p2 Godfather ataca a p3 y la trampa lo para.
    const s = game(["spy", "godfather", "investigator", "trapper"], { dayNumber: 2, traps: { p4: { targetId: "p3", readyDay: 2 } } });
    const { events } = resolve(s, [night("p1", "bug", "p3"), night("p2", "kill", "p3")]);
    expect(spyResults(events)).toEqual([["p1", "p3", "protect"]]);
  });
});

describe("Spy: el atacante curado tras un contraataque del Bodyguard (wiki: Spy.md:255)", () => {
  it("'A Bodyguard attacked your target but someone nursed them back to health!' (Spy.md:255)", () => {
    // p3 Godfather ataca a p5; p4 Bodyguard lo protege y contraataca al Godfather; p2 Doctor cura al Godfather.
    const s = game(["spy", "doctor", "godfather", "bodyguard", "investigator"]);
    const { events, state } = resolve(s, [night("p1", "bug", "p3"), night("p2", "heal", "p3"), night("p3", "kill", "p5"), night("p4", "protect", "p5")]);
    expect(spyResults(events)).toEqual([["p1", "p3", "bodyguard_attack_healed"]]);
    expect(state.players.find((p) => p.id === "p3")!.status).toBe("alive");
  });

  it("sin curación del atacante, el Spy ve que murió por el Bodyguard, no el mensaje de curado (Spy.md:259)", () => {
    const s = game(["spy", "godfather", "bodyguard", "investigator"]);
    const { events } = resolve(s, [night("p1", "bug", "p2"), night("p2", "kill", "p4"), night("p3", "protect", "p4")]);
    expect(spyResults(events)).toEqual([["p1", "p2", "killed_by_bodyguard"]]);
  });
});
