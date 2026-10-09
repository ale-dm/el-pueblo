import { describe, expect, it } from "vitest";
import { game, ofType, rejected, step, timer, types } from "./helpers/game.js";

describe("día: votación y juicio", () => {
  const day = (roles: string[]) => game(roles, { phase: "voting", dayNumber: 1 });

  it("con mayoría de votos se abre un juicio y luego la defensa", () => {
    let s = day(["godfather", "investigator", "sheriff", "doctor"]);
    s = step(s, { type: "vote", voterId: "p1", targetId: "p2" }).state;
    s = step(s, { type: "vote", voterId: "p3", targetId: "p2" }).state;
    const r = step(s, timer());
    expect(types(r.events)).toEqual(["trial.started", "phase.started"]);
    expect(r.state.phase).toBe("defense");
    expect(r.state.defendantId).toBe("p2");
  });

  it("sin mayoría no hay juicio y el día pasa a la noche", () => {
    let s = day(["godfather", "investigator", "sheriff", "doctor"]);
    s = step(s, { type: "vote", voterId: "p1", targetId: "p2" }).state;
    const r = step(s, timer());
    expect(r.state.phase).toBe("night");
  });

  it("culpable por mayoría: el acusado es ahorcado y hay últimas palabras", () => {
    let s = game(["godfather", "investigator", "sheriff", "doctor"], { phase: "judgement", defendantId: "p2", dayNumber: 1 });
    s = step(s, { type: "judgement.vote", voterId: "p1", verdict: "guilty" }).state;
    s = step(s, { type: "judgement.vote", voterId: "p3", verdict: "guilty" }).state;
    s = step(s, { type: "judgement.vote", voterId: "p4", verdict: "innocent" }).state;
    const r = step(s, timer());
    expect(ofType(r.events, "player.hanged")[0]?.payload.playerId).toBe("p2");
    expect(r.state.phase).toBe("last_words");
    expect(r.state.players.find((p) => p.id === "p2")?.status).toBe("dead");
  });

  it("inocente por mayoría: el día sigue con votación y el juicio cuenta", () => {
    let s = game(["godfather", "investigator", "sheriff", "doctor"], { phase: "judgement", defendantId: "p2", dayNumber: 1, trialsToday: 1 });
    s = step(s, { type: "judgement.vote", voterId: "p1", verdict: "innocent" }).state;
    s = step(s, { type: "judgement.vote", voterId: "p3", verdict: "innocent" }).state;
    const r = step(s, timer());
    expect(ofType(r.events, "player.hanged")).toHaveLength(0);
    expect(r.state.phase).toBe("voting");
  });

  it("empate en el veredicto no ahorca", () => {
    let s = game(["godfather", "investigator", "sheriff", "doctor"], { phase: "judgement", defendantId: "p2", dayNumber: 1 });
    s = step(s, { type: "judgement.vote", voterId: "p1", verdict: "guilty" }).state;
    s = step(s, { type: "judgement.vote", voterId: "p3", verdict: "innocent" }).state;
    const r = step(s, timer());
    expect(ofType(r.events, "player.hanged")).toHaveLength(0);
  });

  it("tras tres juicios el día termina aunque queden votos", () => {
    let s = game(["godfather", "investigator", "sheriff", "doctor"], { phase: "judgement", defendantId: "p2", dayNumber: 1, trialsToday: 3 });
    s = step(s, { type: "judgement.vote", voterId: "p1", verdict: "innocent" }).state;
    expect(step(s, timer()).state.phase).toBe("night");
  });

  it("el Mayor revelado cuenta su voto por tres", () => {
    let s = game(["mayor", "godfather", "investigator", "sheriff"], { phase: "discussion", dayNumber: 1 });
    s = step(s, { type: "day.action", actorId: "p1", ability: "reveal", targetId: null }).state;
    s = step(s, timer()).state;
    s = step(s, { type: "vote", voterId: "p1", targetId: "p3" }).state;
    const r = step(s, timer());
    expect(r.state.phase).toBe("defense");
    expect(r.state.defendantId).toBe("p3");
  });

  it("un jugador desconectado no vota y no cuenta para el mínimo", () => {
    let s = day(["godfather", "investigator", "sheriff", "doctor"]);
    s = { ...s, players: s.players.map((p) => (p.id === "p4" ? { ...p, connected: false } : p)) };
    expect(rejected(s, { type: "vote", voterId: "p4", targetId: "p1" })).toMatch(/No puedes votar/);
  });

  it("solo se vota en la fase de votación", () => {
    const s = game(["godfather", "investigator"], { phase: "discussion" });
    expect(rejected(s, { type: "vote", voterId: "p1", targetId: "p2" })).toMatch(/wrong_phase|votación/);
  });

  it("las habilidades de día solo se usan una vez al día", () => {
    const s = game(["jailor", "investigator", "godfather"], { phase: "discussion", dayNumber: 1 });
    const once = step(s, { type: "day.action", actorId: "p1", ability: "jail", targetId: "p2" }).state;
    expect(rejected(once, { type: "day.action", actorId: "p1", ability: "jail", targetId: "p3" })).toMatch(/hoy/);
  });
});

describe("día: chat", () => {
  it("la Mafia habla de noche por su canal; el resto no", () => {
    const night = game(["godfather", "investigator"]);
    expect(rejected(night, { type: "chat.send", senderId: "p1", channel: "mafia", text: "hola" })).toBeNull();
    expect(rejected(night, { type: "chat.send", senderId: "p2", channel: "mafia", text: "hola" })).toMatch(/Solo la Mafia/);
    expect(rejected(night, { type: "chat.send", senderId: "p1", channel: "public", text: "hola" })).toMatch(/cerrado/);
  });

  it("en la defensa solo habla el acusado", () => {
    const s = game(["godfather", "investigator", "sheriff"], { phase: "defense", defendantId: "p2" });
    expect(rejected(s, { type: "chat.send", senderId: "p2", channel: "public", text: "no fui yo" })).toBeNull();
    expect(rejected(s, { type: "chat.send", senderId: "p3", channel: "public", text: "culpable" })).toMatch(/acusado/);
  });

  it("un jugador silenciado por el Blackmailer no habla de día", () => {
    const s = game(["blackmailer", "investigator"], { phase: "discussion" });
    const silenced = { ...s, players: s.players.map((p) => (p.id === "p2" ? { ...p, flags: { blackmailed: true as const } } : p)) };
    // Wiki (Blackmailer.md:209): "You are Blackmailed." como mensaje al emisor, y el texto no llega a nadie.
    const r = step(silenced, { type: "chat.send", senderId: "p2", channel: "public", text: "hola" });
    expect(ofType(r.events, "chat.refused").map((e) => [e.audiencePlayerId, e.payload.reason])).toEqual([["p2", "blackmailed"]]);
    expect(ofType(r.events, "chat.message")).toHaveLength(0);
  });

  it("los muertos hablan en su canal y no en el público", () => {
    const s = game(["godfather", "investigator"], { phase: "discussion" });
    const dead = { ...s, players: s.players.map((p) => (p.id === "p2" ? { ...p, status: "dead" as const } : p)) };
    expect(rejected(dead, { type: "chat.send", senderId: "p2", channel: "dead", text: "ay" })).toBeNull();
    expect(rejected(dead, { type: "chat.send", senderId: "p2", channel: "public", text: "ay" })).toMatch(/muertos/);
  });

  it("los mensajes vacíos o demasiado largos se rechazan", () => {
    const s = game(["godfather", "investigator"], { phase: "discussion" });
    expect(rejected(s, { type: "chat.send", senderId: "p1", channel: "public", text: "   " })).toMatch(/caracteres/);
    expect(rejected(s, { type: "chat.send", senderId: "p1", channel: "public", text: "x".repeat(501) })).toMatch(/caracteres/);
  });
});
