import { describe, expect, it } from "vitest";
import { game, ofType, rejected, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

const kills = (events: ReturnType<typeof step>["events"]) =>
  ofType(events, "player.killed").map((e) => e.payload.playerId);

describe("Medium: solo habla desde el más allá", () => {
  const medium = (dead: boolean): GameState => {
    const s = game(["medium", "godfather", "investigator", "sheriff"]);
    if (dead) s.players[0] = { ...s.players[0]!, status: "dead" };
    return s;
  };

  it("un vivo no puede usar la sesión de Médium", () => {
    expect(rejected(medium(false), { type: "night.action", actorId: "p1", ability: "seance", targetId: "p3", secondTargetId: null })).toMatch(/Solo los muertos/);
  });

  it("un muerto puede abrir una sesión con un vivo, y solo una vez", () => {
    let s = medium(true);
    s = step(s, { type: "night.action", actorId: "p1", ability: "seance", targetId: "p3", secondTargetId: null }).state;
    expect(step(s, { type: "chat.send", senderId: "p1", channel: "seance", text: "¿Quién me mató?" }).events).toHaveLength(2);
    s = step(s, timer()).state;
    expect(s.players[0]!.usesLeft.seance).toBe(0);
    s = { ...s, phase: "night", dayNumber: 2 };
    expect(rejected(s, { type: "night.action", actorId: "p1", ability: "seance", targetId: "p3", secondTargetId: null })).toMatch(/usos/);
  });
});

describe("Retributionist: zombis", () => {
  // p2 es un Doctor muerto (zombi) que curaría a p4; p3 Godfather ataca a p4.
  const withZombie = (): GameState => {
    const s = game(["retributionist", "doctor", "godfather", "investigator"]);
    s.players[1] = { ...s.players[1]!, status: "dead" };
    return s;
  };

  it("solo resucita a un Town muerto cuyo rol se conoce", () => {
    const s = withZombie();
    expect(rejected(s, { type: "night.action", actorId: "p1", ability: "raise", targetId: "p4", secondTargetId: "p3" })).toMatch(/Town muerto/);
  });

  it("el zombi usa su habilidad sobre el segundo objetivo y no se puede reutilizar", () => {
    let s = withZombie();
    s = step(s, { type: "night.action", actorId: "p1", ability: "raise", targetId: "p2", secondTargetId: "p4" }).state;
    s = step(s, { type: "night.action", actorId: "p3", ability: "kill", targetId: "p4", secondTargetId: null }).state;
    const { state, events } = step(s, timer());
    expect(kills(events)).not.toContain("p4");
    expect(state.players[1]!.flags.zombied).toBe(true);
    expect(rejected({ ...state, phase: "night", dayNumber: 2 }, { type: "night.action", actorId: "p1", ability: "raise", targetId: "p2", secondTargetId: "p4" })).toMatch(/zombi ya se ha usado/);
  });
});

describe("Disguiser: el disfraz engaña al Sheriff", () => {
  it("un Mafioso disfrazado de Town sale inocente al Sheriff", () => {
    let s = game(["disguiser", "mafioso", "sheriff", "jailor"]);
    s = step(s, { type: "night.action", actorId: "p1", ability: "disguise", targetId: "p2", secondTargetId: "p4" }).state;
    s = step(s, { type: "night.action", actorId: "p3", ability: "interrogate", targetId: "p2", secondTargetId: null }).state;
    const { events } = step(s, timer());
    expect(ofType(events, "investigation.result").map((e) => e.payload.result)).toEqual(["innocent"]);
  });

  it("sin disfraz, el Mafioso sale sospechoso", () => {
    let s = game(["disguiser", "mafioso", "sheriff", "jailor"]);
    s = step(s, { type: "night.action", actorId: "p3", ability: "interrogate", targetId: "p2", secondTargetId: null }).state;
    expect(ofType(step(s, timer()).events, "investigation.result").map((e) => e.payload.result)).toEqual(["suspicious"]);
  });

  it("el disfraz debe ser de alguien que no es de la Mafia", () => {
    const s = game(["disguiser", "mafioso", "godfather", "sheriff"]);
    expect(rejected(s, { type: "night.action", actorId: "p1", ability: "disguise", targetId: "p2", secondTargetId: "p3" })).toMatch(/no es de la Mafia/);
  });
});

describe("Forger: testamentos falsificados", () => {
  it("al morir, el rol que se muestra es el que eligió el Forger (dos usos)", () => {
    let s = game(["forger", "investigator", "godfather", "sheriff"]);
    s = step(s, { type: "night.action", actorId: "p1", ability: "forge", targetId: "p2", secondTargetId: null, choice: "jailor" }).state;
    s = step(s, { type: "night.action", actorId: "p3", ability: "kill", targetId: "p2", secondTargetId: null }).state;
    const { state, events } = step(s, timer());
    expect(ofType(events, "will.forged").map((e) => e.payload.role)).toEqual(["jailor"]);
    expect(ofType(events, "player.killed").map((e) => e.payload.roleKey)).toEqual(["jailor"]);
    expect(state.players[0]!.usesLeft.forge).toBe(1);
  });

  it("exige un rol válido", () => {
    const s = game(["forger", "investigator", "godfather", "sheriff"]);
    expect(rejected(s, { type: "night.action", actorId: "p1", ability: "forge", targetId: "p2", secondTargetId: null })).toMatch(/Elige una opción/);
    expect(rejected(s, { type: "night.action", actorId: "p1", ability: "forge", targetId: "p2", secondTargetId: null, choice: "nadie" })).toMatch(/Rol desconocido/);
  });
});

describe("Hypnotist: recuerdos falsos", () => {
  it("el mensaje solo lo ve su objetivo", () => {
    let s = game(["hypnotist", "investigator", "godfather", "sheriff"]);
    s = step(s, { type: "night.action", actorId: "p1", ability: "hypnotize", targetId: "p2", secondTargetId: null, choice: "attacked" }).state;
    const messages = ofType(step(s, timer()).events, "hypnosis.message");
    expect(messages).toHaveLength(1);
    expect(messages[0]!.payload).toEqual({ playerId: "p2", message: "attacked" });
    expect(messages[0]!.audiencePlayerId).toBe("p2");
  });

  it("exige una de las tres opciones", () => {
    const s = game(["hypnotist", "investigator", "godfather", "sheriff"]);
    expect(rejected(s, { type: "night.action", actorId: "p1", ability: "hypnotize", targetId: "p2", secondTargetId: null, choice: "killed" })).toMatch(/Opción no válida/);
  });
});

describe("Ascenso a Mafioso (wiki: Hypnotist, Forger, Disguiser)", () => {
  it("si muere el último Mafioso que mata, un apoyo se convierte en Mafioso", () => {
    const s = game(["disguiser", "godfather", "sheriff", "jailor"]);
    s.players[1] = { ...s.players[1]!, status: "dead" };
    const { state, events } = step(s, timer());
    expect(ofType(events, "role.promoted").map((e) => e.payload.playerId)).toEqual(["p1"]);
    expect(state.players[0]!.roleKey).toBe("mafioso");
    expect(state.players[0]!.faction).toBe("mafia");
  });

  it("mientras quede un Mafioso que mata, nadie asciende", () => {
    const s = game(["disguiser", "godfather", "sheriff", "jailor"]);
    expect(ofType(step(s, timer()).events, "role.promoted")).toHaveLength(0);
  });
});
