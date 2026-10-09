import { describe, expect, it } from "vitest";
import { decide } from "../src/core/decide.js";
import { ctx, game, ofType } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

/** Jailor (p1) con un prisionero (p2) y un Mafioso (p3). */
function jailedGame(dayNumber: number): GameState {
  const s = game(["jailor", "mafioso", "investigator"], { phase: "night", dayNumber });
  s.players[1]!.flags = { jailed: true };
  return s;
}

describe("Jailor: ejecución", () => {
  it("no puede ejecutar en la primera noche, aunque el prisionero esté encarcelado", () => {
    const r = decide(jailedGame(1), { type: "night.action", actorId: "p1", ability: "execute", targetId: "p2", secondTargetId: null }, ctx());
    expect(r.ok).toBe(false);
  });

  it("sí puede ejecutar desde la segunda noche", () => {
    const r = decide(jailedGame(2), { type: "night.action", actorId: "p1", ability: "execute", targetId: "p2", secondTargetId: null }, ctx());
    expect(r.ok).toBe(true);
  });
});

import { apply } from "../src/core/apply.js";
import type { Command } from "../src/types/commands.js";
import type { GameEventEnvelope } from "../src/types/events.js";
import { ctx as ctxOf } from "./helpers/game.js";

function play(s: GameState, command: Command): { state: GameState; events: GameEventEnvelope[] } {
  const r = decide(s, command, ctxOf());
  if (!r.ok) throw new Error(r.error.message);
  return { state: r.value.reduce(apply, s), events: r.value };
}
const rejected = (s: GameState, command: Command) => {
  const r = decide(s, command, ctxOf());
  return r.ok ? null : r.error.message;
};
const killedIds = (events: GameEventEnvelope[]) => events.filter((e) => e.type === "player.killed").map((e) => e.payload.playerId);
/** Jailor (p1) tiene encarcelado a p2 esta noche. */
function jailed(roles: string[], dayNumber = 2): GameState {
  const s = game(roles, { phase: "night", dayNumber });
  s.players[1]!.flags = { jailed: true };
  s.jailedBy = { p2: "p1" };
  return s;
}

describe("Jailor: comportamiento según la wiki", () => {
  it("la ejecución es imparable: mata aunque el prisionero esté protegido", () => {
    let s = jailed(["jailor", "investigator", "doctor"]);
    s = play(s, { type: "night.action", actorId: "p3", ability: "heal", targetId: "p2", secondTargetId: null }).state;
    s = play(s, { type: "night.action", actorId: "p1", ability: "execute", targetId: "p2", secondTargetId: null }).state;
    expect(killedIds(play(s, { type: "timer.expired" }).events)).toContain("p2");
  });

  it("el encarcelado tiene defensa poderosa: un ataque de la Mafia no le mata", () => {
    let s = jailed(["jailor", "investigator", "godfather"]);
    s = play(s, { type: "night.action", actorId: "p3", ability: "kill", targetId: "p2", secondTargetId: null }).state;
    expect(killedIds(play(s, { type: "timer.expired" }).events)).not.toContain("p2");
  });

  it("tras ejecutar a un Town, no puede volver a ejecutar", () => {
    let s = jailed(["jailor", "investigator", "godfather"]);
    s = play(s, { type: "night.action", actorId: "p1", ability: "execute", targetId: "p2", secondTargetId: null }).state;
    const after = play(s, { type: "timer.expired" }).state;
    expect(after.players[0]!.flags.noExecute).toBe(true);
    const next = { ...after, phase: "night" as const, dayNumber: 3, jailedBy: { p3: "p1" } };
    next.players[2] = { ...next.players[2]!, flags: { jailed: true } };
    expect(rejected(next, { type: "night.action", actorId: "p1", ability: "execute", targetId: "p3", secondTargetId: null })).toMatch(/Ya no puedes ejecutar/);
  });

  it("el Jailor y su prisionero hablan en privado; nadie más lo ve", () => {
    const s = jailed(["jailor", "investigator", "godfather"]);
    const sent = play(s, { type: "chat.send", senderId: "p1", channel: "jail", text: "Confiesa." }).events;
    expect(sent).toHaveLength(2);
    const after = sent.reduce(apply, s);
    const seenBy = (id: string) => sent.filter((e) => e.audiencePlayerId === id).length;
    expect(seenBy("p1")).toBe(1);
    expect(seenBy("p2")).toBe(1);
    expect(seenBy("p3")).toBe(0);
    expect(after.jailedBy.p2).toBe("p1");
  });

  it("solo quien está encarcelado o encarcela puede usar ese canal", () => {
    const s = jailed(["jailor", "investigator", "godfather"]);
    expect(rejected(s, { type: "chat.send", senderId: "p3", channel: "jail", text: "hola" })).toMatch(/encarcelado/);
  });
});

describe("Encarcelados: el visitante falla, pero su visita cuenta (wiki: Jailor.md:252)", () => {
  const notices = (events: GameEventEnvelope[]) => events.filter((e) => e.type === "night.notice").map((e) => [e.payload.playerId, e.payload.notice]);

  it("el Sheriff que interroga a un encarcelado no recibe resultado; el Tracker ve su visita", () => {
    // p1 Jailor, p2 prisionero, p3 Sheriff visita a p2, p4 Tracker sigue al Sheriff.
    let s = jailed(["jailor", "investigator", "sheriff", "tracker"]);
    s = play(s, { type: "night.action", actorId: "p3", ability: "interrogate", targetId: "p2", secondTargetId: null }).state;
    s = play(s, { type: "night.action", actorId: "p4", ability: "track", targetId: "p3", secondTargetId: null }).state;
    const { events } = play(s, { type: "timer.expired" });
    expect(events.some((e) => e.type === "investigation.result" && e.payload.investigatorId === "p3")).toBe(false);
    expect(ofType(events, "investigation.result").find((e) => e.payload.investigatorId === "p4")?.payload.result).toBe("P2");
    expect(notices(events)).toContainEqual(["p3", "target_jailed"]);
  });

  it("el Doctor que cura a un encarcelado recibe el aviso y su visita sigue viéndose", () => {
    let s = jailed(["jailor", "investigator", "doctor", "tracker"]);
    s = play(s, { type: "night.action", actorId: "p3", ability: "heal", targetId: "p2", secondTargetId: null }).state;
    s = play(s, { type: "night.action", actorId: "p4", ability: "track", targetId: "p3", secondTargetId: null }).state;
    const { events } = play(s, { type: "timer.expired" });
    expect(notices(events)).toContainEqual(["p3", "target_jailed"]);
    expect(ofType(events, "investigation.result").find((e) => e.payload.investigatorId === "p4")?.payload.result).toBe("P2");
  });

  it("el Vigilante que dispara a un encarcelado no pierde bala y el prisionero recibe el intento", () => {
    let s = jailed(["jailor", "investigator", "vigilante"]);
    s = play(s, { type: "night.action", actorId: "p3", ability: "shoot", targetId: "p2", secondTargetId: null }).state;
    const { state, events } = play(s, { type: "timer.expired" });
    expect(state.players[2]!.usesLeft.shoot).toBe(3);
    expect(notices(events)).toContainEqual(["p2", "attack_attempt"]);
    expect(events.find((e) => e.type === "night.notice" && e.payload.playerId === "p2")?.audiencePlayerId).toBe("p2");
    expect(killedIds(events)).not.toContain("p2");
  });

  it("el Janitor que limpia a un encarcelado no lo limpia", () => {
    // Con Godfather vivo, el Janitor no se convierte en Mafioso al resolver la noche.
    let s = jailed(["jailor", "investigator", "janitor", "godfather"]);
    s = play(s, { type: "night.action", actorId: "p3", ability: "clean", targetId: "p2", secondTargetId: null }).state;
    const { state, events } = play(s, { type: "timer.expired" });
    expect(events.some((e) => e.type === "effect.applied" && e.payload.flag === "cleaned")).toBe(false);
    expect(state.players[2]!.usesLeft.clean).toBe(3);
  });
});
