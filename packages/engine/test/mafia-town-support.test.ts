import { describe, expect, it } from "vitest";
import { game, ofType, rejected, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

const kills = (events: ReturnType<typeof step>["events"]) =>
  ofType(events, "player.killed").map((e) => e.payload.playerId);

describe("Mayor: su voto cuenta tres también en el juicio (wiki: Mayor)", () => {
  it("un Mayor revelado vota culpable frente a dos inocentes y el veredicto es culpable", () => {
    const s = game(["mayor", "investigator", "sheriff", "godfather"], { phase: "judgement", dayNumber: 2, defendantId: "p4" });
    s.players[0] = { ...s.players[0]!, flags: { mayorRevealed: true } };
    let t = step(s, { type: "judgement.vote", voterId: "p1", verdict: "guilty" }).state;
    t = step(t, { type: "judgement.vote", voterId: "p2", verdict: "innocent" }).state;
    t = step(t, { type: "judgement.vote", voterId: "p3", verdict: "innocent" }).state;
    const verdict = ofType(step(t, timer()).events, "trial.verdict")[0]!;
    expect(verdict.payload).toMatchObject({ defendantId: "p4", verdict: "guilty", guiltyWeight: 3, innocentWeight: 2 });
  });

  it("sin revelar, el mismo Mayor cuenta uno y el juicio es inocente", () => {
    const s = game(["mayor", "investigator", "sheriff", "godfather"], { phase: "judgement", dayNumber: 2, defendantId: "p4" });
    let t = step(s, { type: "judgement.vote", voterId: "p1", verdict: "guilty" }).state;
    t = step(t, { type: "judgement.vote", voterId: "p2", verdict: "innocent" }).state;
    t = step(t, { type: "judgement.vote", voterId: "p3", verdict: "innocent" }).state;
    expect(ofType(step(t, timer()).events, "trial.verdict")[0]?.payload).toMatchObject({ verdict: "innocent", guiltyWeight: 1, innocentWeight: 2 });
  });
});

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

describe("Medium: habla con los muertos y avisa a su objetivo (wiki: Medium)", () => {
  const night = () => game(["medium", "godfather", "investigator", "sheriff"], { phase: "night", dayNumber: 2 });

  it("el Médium vivo habla con los muertos de noche: lo ven como Medium y él se oye a sí mismo", () => {
    const events = step(night(), { type: "chat.send", senderId: "p1", channel: "dead", text: "¿Quién me mató?" }).events;
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ visibility: "dead", payload: { anonymous: true } });
    expect(events[1]).toMatchObject({ visibility: "private", audiencePlayerId: "p1" });
  });

  it("un vivo que no es Médium no habla con los muertos", () => {
    expect(rejected(night(), { type: "chat.send", senderId: "p3", channel: "dead", text: "hola" })).toMatch(/Solo hablan los muertos/);
  });

  it("de noche, el Médium vivo oye a los muertos; de día no", () => {
    const s = night();
    s.players[3] = { ...s.players[3]!, status: "dead" };
    const events = step(s, { type: "chat.send", senderId: "p4", channel: "dead", text: "Fui el Sheriff." }).events;
    expect(events.find((e) => e.visibility === "private")).toMatchObject({ audiencePlayerId: "p1", payload: { senderId: "p4" } });
    expect(events.filter((e) => e.visibility === "dead")).toHaveLength(1);
    const day = { ...s, phase: "discussion" as const };
    expect(step(day, { type: "chat.send", senderId: "p4", channel: "dead", text: "de día" }).events.every((e) => e.visibility === "dead")).toBe(true);
  });

  it("encarcelado, el Médium no habla con los muertos", () => {
    const s = night();
    s.players[0] = { ...s.players[0]!, flags: { jailed: true } };
    expect(rejected(s, { type: "chat.send", senderId: "p1", channel: "dead", text: "hola" })).toMatch(/Encarcelado/);
  });

  it("el objetivo de una sesión de Médium recibe el aviso al empezar la noche", () => {
    const s = game(["medium", "godfather", "investigator", "sheriff"], { phase: "night", dayNumber: 2 });
    s.players[0] = { ...s.players[0]!, status: "dead" };
    const { events } = step(step(s, { type: "night.action", actorId: "p1", ability: "seance", targetId: "p3", secondTargetId: null }).state, timer());
    const notices = ofType(events, "night.notice").filter((e) => e.payload.notice === "medium_talking");
    expect(notices.map((e) => e.payload.playerId)).toEqual(["p3"]);
    expect(notices[0]!.audiencePlayerId).toBe("p3");
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

describe("Consigliere: el disfraz no le engaña", () => {
  it("un Mafioso disfrazado de Town sigue mostrando su rol real al Consigliere (wiki: Consigliere)", () => {
    let s = game(["disguiser", "mafioso", "consigliere", "investigator"]);
    s = step(s, { type: "night.action", actorId: "p1", ability: "disguise", targetId: "p2", secondTargetId: "p4" }).state;
    s = step(s, { type: "night.action", actorId: "p3", ability: "check", targetId: "p2", secondTargetId: null }).state;
    const { events } = step(s, timer());
    expect(ofType(events, "investigation.result").map((e) => e.payload.result)).toEqual(["Mafioso"]);
  });
});

describe("Hypnotist: el bloqueo a un inmune lleva el mensaje de inmunidad (wiki: Hypnotist)", () => {
  const hypnotize = (target: string, choice: string) => {
    // p1 Hypnotist planta un recuerdo; el Godfather (p2) no mata, para que solo cuente el mensaje.
    const s = game(["hypnotist", "godfather", "transporter", "investigator"]);
    return ofType(step(step(s, { type: "night.action", actorId: "p1", ability: "hypnotize", targetId: target, secondTargetId: null, choice }).state, timer()).events, "hypnosis.message");
  };

  it("a un inmune al bloqueo le llega 'Someone tried to Roleblock you but you are immune'", () => {
    expect(hypnotize("p3", "roleblocked").map((e) => [e.payload.playerId, e.payload.message])).toEqual([["p3", "roleblock_immune"]]);
  });

  it("a quien no es inmune le llega el bloqueo normal", () => {
    expect(hypnotize("p4", "roleblocked").map((e) => [e.payload.playerId, e.payload.message])).toEqual([["p4", "roleblocked"]]);
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

  it("si el falsificado no muere esa noche, la falsificación caduca: ahorcado muestra su rol real", () => {
    let s = game(["forger", "investigator", "godfather", "sheriff"], { phase: "night", dayNumber: 2 });
    s = step(s, { type: "night.action", actorId: "p1", ability: "forge", targetId: "p2", secondTargetId: null, choice: "jailor" }).state;
    s = step(s, timer()).state; // nadie ataca a p2: la noche termina sin muertos
    // Día siguiente: p2 es juzgado y ahorcado.
    s = { ...s, phase: "judgement", dayNumber: 3, defendantId: "p2" };
    s = step(s, { type: "judgement.vote", voterId: "p3", verdict: "guilty" }).state;
    s = step(s, { type: "judgement.vote", voterId: "p4", verdict: "guilty" }).state;
    const hanged = ofType(step(s, timer()).events, "player.hanged");
    expect(hanged.map((e) => e.payload.roleKey)).toEqual(["investigator"]);
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

  it("un Mafioso vivo pasa a Godfather cuando muere el Godfather (wiki: Godfather, Mafioso)", () => {
    const s = game(["godfather", "mafioso", "sheriff", "investigator"]);
    s.players[0] = { ...s.players[0]!, status: "dead" };
    const { state, events } = step(s, timer());
    expect(ofType(events, "role.promoted").map((e) => [e.payload.playerId, e.payload.roleKey])).toEqual([["p2", "godfather"]]);
    expect(state.players[1]!.roleKey).toBe("godfather");
    // El nuevo Godfather mata con su habilidad.
    const next = step({ ...state, phase: "night", dayNumber: 2 }, { type: "night.action", actorId: "p2", ability: "kill", targetId: "p4", secondTargetId: null });
    expect(next.state.nightActions["p2"]?.targetId).toBe("p4");
  });

  it("un Ambusher vivo impide el ascenso de los apoyos (wiki: Ambusher es Mafia Killing)", () => {
    const s = game(["godfather", "ambusher", "bootlegger", "sheriff", "investigator"]);
    s.players[0] = { ...s.players[0]!, status: "dead" };
    expect(ofType(step(s, timer()).events, "role.promoted")).toHaveLength(0);
  });

  it("sin Godfather ni Mafioso que mate, asciende primero el Bootlegger (wiki: Bootlegger)", () => {
    const s = game(["godfather", "disguiser", "bootlegger", "sheriff", "investigator"]);
    s.players[0] = { ...s.players[0]!, status: "dead" };
    const { events } = step(s, timer());
    expect(ofType(events, "role.promoted").map((e) => [e.payload.playerId, e.payload.roleKey])).toEqual([["p3", "mafioso"]]);
  });

  it("mientras quede un Mafioso que mata, nadie asciende", () => {
    const s = game(["disguiser", "godfather", "sheriff", "jailor"]);
    expect(ofType(step(s, timer()).events, "role.promoted")).toHaveLength(0);
  });
});

describe("Retributionist: el zombi trabaja para el Retributionist (wiki: Retributionist)", () => {
  // p1 Retributionist resucita a p2 (Sheriff muerto). El zombi interroga a p3.
  it("los resultados del zombi llegan al Retributionist, no al cadáver", () => {
    const s = game(["retributionist", "sheriff", "investigator", "godfather"]);
    s.players[1] = { ...s.players[1]!, status: "dead" };
    const raised = step(s, { type: "night.action", actorId: "p1", ability: "raise", targetId: "p2", secondTargetId: "p3" }).state;
    const { events } = step(raised, timer());
    const results = ofType(events, "investigation.result").filter((e) => e.payload.check === "suspicious");
    expect(results.map((e) => [e.payload.investigatorId, e.payload.targetId])).toEqual([["p1", "p3"]]);
    expect(results[0]!.audiencePlayerId).toBe("p1");
  });

  // p2 es un Bodyguard muerto que el Retributionist resucita para proteger a p4. El Godfather (p3) ataca a p4.
  it("el guardaespaldas zombi protege y contraataca: el Godfather muere y el objetivo vive", () => {
    const s = game(["retributionist", "bodyguard", "godfather", "investigator", "doctor"]);
    s.players[1] = { ...s.players[1]!, status: "dead" };
    const { events } = step(step(step(s, { type: "night.action", actorId: "p1", ability: "raise", targetId: "p2", secondTargetId: "p4" }).state,
      { type: "night.action", actorId: "p3", ability: "kill", targetId: "p4", secondTargetId: null }).state, timer());
    expect(ofType(events, "player.killed").map((e) => [e.payload.playerId, e.payload.cause])).toEqual([["p3", "bodyguard"]]);
    expect(ofType(events, "attack.prevented")[0]?.payload).toEqual({ victimId: "p4", protectorId: "p1" });
  });
});
