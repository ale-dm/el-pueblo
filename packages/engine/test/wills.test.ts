import { describe, expect, it } from "vitest";
import { apply } from "../src/core/apply.js";
import { decide } from "../src/core/decide.js";
import type { Command } from "../src/types/commands.js";
import type { GameEventEnvelope } from "../src/types/events.js";
import type { GameState } from "../src/types/state.js";
import { ctx, game } from "./helpers/game.js";

function play(s: GameState, command: Command): { state: GameState; events: GameEventEnvelope[] } {
  const r = decide(s, command, ctx());
  if (!r.ok) throw new Error(r.error.message);
  return { state: r.value.reduce(apply, s), events: r.value };
}
const rejected = (s: GameState, command: Command) => {
  const r = decide(s, command, ctx());
  return r.ok ? null : r.error.message;
};

describe("cancelar la acción nocturna", () => {
  it("se cancela una acción ya elegida y se puede volver a elegir", () => {
    let s = game(["godfather", "investigator", "sheriff"], { phase: "night", dayNumber: 2 });
    s = play(s, { type: "night.action", actorId: "p1", ability: "kill", targetId: "p2", secondTargetId: null }).state;
    expect(s.nightActions["p1"]).toBeDefined();
    s = play(s, { type: "night.action.cancel", actorId: "p1" }).state;
    expect(s.nightActions["p1"]).toBeUndefined();
    s = play(s, { type: "night.action", actorId: "p1", ability: "kill", targetId: "p3", secondTargetId: null }).state;
    expect(s.nightActions["p1"]?.targetId).toBe("p3");
  });

  it("no hay nada que cancelar si no se ha elegido nada", () => {
    expect(rejected(game(["godfather"], { phase: "night", dayNumber: 2 }), { type: "night.action.cancel", actorId: "p1" })).toMatch(/cancelar/);
  });

  it("la cancelación de un miembro de la Mafia la ven sus compañeros; la de otros, solo él", () => {
    let s = game(["godfather", "investigator", "sheriff"], { phase: "night", dayNumber: 2 });
    s = play(s, { type: "night.action", actorId: "p1", ability: "kill", targetId: "p2", secondTargetId: null }).state;
    const mafia = play(s, { type: "night.action.cancel", actorId: "p1" }).events[0]!;
    expect(mafia.visibility).toBe("mafia");

    let t = game(["godfather", "investigator", "sheriff"], { phase: "night", dayNumber: 2 });
    t = play(t, { type: "night.action", actorId: "p2", ability: "investigate", targetId: "p3", secondTargetId: null }).state;
    const town = play(t, { type: "night.action.cancel", actorId: "p2" }).events[0]!;
    expect(town.visibility).toBe("private");
    expect(town.audiencePlayerId).toBe("p2");
  });
});

describe("decisiones nocturnas de la Mafia", () => {
  it("la acción de un miembro de la Mafia la ven sus compañeros; la de un Town, solo él", () => {
    const s = game(["godfather", "investigator"], { phase: "night", dayNumber: 2 });
    const mafia = play(s, { type: "night.action", actorId: "p1", ability: "kill", targetId: "p2", secondTargetId: null }).events[0]!;
    expect(mafia.visibility).toBe("mafia");
    const town = play(s, { type: "night.action", actorId: "p2", ability: "investigate", targetId: "p1", secondTargetId: null }).events[0]!;
    expect(town.visibility).toBe("private");
    expect(town.audiencePlayerId).toBe("p2");
  });
});

describe("últimas voluntades", () => {
  it("un vivo escribe su testamento; se revela al morir", () => {
    let s = game(["doctor", "godfather", "investigator"], { phase: "night", dayNumber: 2 });
    s = play(s, { type: "will.write", playerId: "p1", text: "Dejo mi casa a Bea." }).state;
    expect(s.wills["p1"]).toBe("Dejo mi casa a Bea.");
    s = play(s, { type: "night.action", actorId: "p2", ability: "kill", targetId: "p1", secondTargetId: null }).state;
    const killed = play(s, { type: "timer.expired" }).events.find((e) => e.type === "player.killed");
    expect(killed?.payload).toMatchObject({ playerId: "p1", will: "Dejo mi casa a Bea." });
  });

  it("un limpiado no deja testamento visible", () => {
    let s = game(["doctor", "janitor", "godfather"], { phase: "night", dayNumber: 2 });
    s = play(s, { type: "will.write", playerId: "p1", text: "Secreto." }).state;
    s = play(s, { type: "night.action", actorId: "p2", ability: "clean", targetId: "p1", secondTargetId: null }).state;
    s = play(s, { type: "night.action", actorId: "p3", ability: "kill", targetId: "p1", secondTargetId: null }).state;
    const killed = play(s, { type: "timer.expired" }).events.find((e) => e.type === "player.killed");
    expect(killed?.payload.will).toBeNull();
  });

  it("un ahorcado revela su testamento", () => {
    let s = game(["doctor", "godfather", "investigator"], { phase: "judgement", dayNumber: 2, defendantId: "p1" });
    s.wills["p1"] = "Lo siento.";
    s = play(s, { type: "judgement.vote", voterId: "p2", verdict: "guilty" }).state;
    s = play(s, { type: "judgement.vote", voterId: "p3", verdict: "guilty" }).state;
    const hanged = play(s, { type: "timer.expired" }).events.find((e) => e.type === "player.hanged");
    expect(hanged?.payload).toMatchObject({ playerId: "p1", will: "Lo siento." });
  });

  it("los muertos no escriben, y el texto tiene un máximo", () => {
    const dead = apply(game(["doctor", "godfather"]), { seq: 1, type: "player.killed", payload: { playerId: "p1", cause: "x", roleKey: null, will: null }, visibility: "public", audiencePlayerId: null });
    expect(rejected(dead, { type: "will.write", playerId: "p1", text: "hola" })).toMatch(/muertos/);
    expect(rejected(game(["doctor"]), { type: "will.write", playerId: "p1", text: "x".repeat(301) })).toMatch(/300/);
  });

  it("el testamento es privado mientras vives", () => {
    const s = game(["doctor", "godfather"]);
    const written = play(s, { type: "will.write", playerId: "p1", text: "Hola" }).events[0]!;
    expect(written.visibility).toBe("private");
    expect(written.audiencePlayerId).toBe("p1");
  });
});
