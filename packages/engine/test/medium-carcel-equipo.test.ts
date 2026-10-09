import { describe, expect, it } from "vitest";
import { canSee } from "../src/projection/visibility.js";
import type { GameState } from "../src/types/state.js";
import { game, ofType, rejected, step } from "./helpers/game.js";

// Médium y cárcel, equipo y muertos (wiki: docs/roles/Medium.md:201, 217-223; docs/roles/Jailor.md:266, 268).

const say = (s: GameState, senderId: string, channel: string, text: string, recipientId?: string) =>
  step(s, { type: "chat.send", senderId, channel, text, recipientId } as Parameters<typeof step>[1]).events;

/** Textos de chat que ve ese jugador. */
const seenBy = (events: ReturnType<typeof step>["events"], s: GameState, playerId: string) => {
  const viewer = s.players.find((p) => p.id === playerId)!;
  return ofType(events, "chat.message").filter((e) => canSee(e, viewer)).map((e) => e.payload.text);
};

const seance = (s: GameState, medium: string, target: string): GameState => ({
  ...s,
  nightActions: { ...s.nightActions, [medium]: { ability: "seance", targetId: target, secondTargetId: null, choice: null } },
});
const dead = (s: GameState, id: string): GameState => ({ ...s, players: s.players.map((p) => (p.id === id ? { ...p, status: "dead" as const } : p)) });
const jailed = (s: GameState, prisoner: string, jailor: string): GameState => ({
  ...s,
  jailedBy: { ...s.jailedBy, [prisoner]: jailor },
  players: s.players.map((p) => (p.id === prisoner ? { ...p, flags: { ...p.flags, jailed: true as const } } : p)),
});

describe("Médium encarcelado: oye a los muertos y al Jailor, y no le oyen (wiki: Medium.md:201)", () => {
  // p1 Jailor, p2 Médium encarcelado, p3 muerto, p4 Godfather vivo.
  const base = () => jailed(dead(game(["jailor", "medium", "investigator", "godfather"]), "p3"), "p2", "p1");

  it("oye a los muertos", () => {
    const s = base();
    const events = say(s, "p3", "dead", "desde el más allá");
    expect(seenBy(events, s, "p2")).toEqual(["desde el más allá"]);
  });

  it("los muertos no le oyen: el Médium encarcelado no puede hablar en el canal de los muertos", () => {
    expect(rejected(base(), { type: "chat.send", senderId: "p2", channel: "dead", text: "hola" })).toMatch(/no te oyen/);
  });

  it("habla con su Jailor, y el Jailor le oye; los muertos no ven ese canal", () => {
    const s = base();
    const events = say(s, "p2", "jail", "te escucho", "p1");
    expect(seenBy(events, s, "p1")).toEqual(["te escucho"]);
    expect(seenBy(events, s, "p3")).toEqual([]);
  });
});

describe("Médium que hace sesión con un encarcelado o con el Jailor (wiki: Medium.md:217-223; Jailor.md:266, 268)", () => {
  // p1 Jailor, p2 prisionero, p3 Médium muerto que hace sesión con p2, p4 Godfather vivo, p5 muerto.
  const withPrisonerSeance = () => seance(jailed(dead(game(["jailor", "investigator", "medium", "godfather", "investigator"]), "p5"), "p2", "p1"), "p3", "p2");
  // Médium que hace sesión con el Jailor (p1).
  const withJailorSeance = () => seance(jailed(dead(game(["jailor", "investigator", "medium", "godfather", "investigator"]), "p5"), "p2", "p1"), "p3", "p1");

  it("con el encarcelado seanceado, el Médium ve el canal de cárcel (Medium.md:217)", () => {
    const s = withPrisonerSeance();
    const events = say(s, "p1", "jail", "cuidado con el Godfather", "p2");
    expect(seenBy(events, s, "p3")).toEqual(["cuidado con el Godfather"]);
    expect(seenBy(events, s, "p5")).toEqual([]);
  });

  it("el encarcelado seanceado habla también con el Médium y con su Jailor (Jailor.md:268)", () => {
    const s = withPrisonerSeance();
    const events = say(s, "p2", "seance", "estoy aquí");
    expect(seenBy(events, s, "p3")).toEqual(["estoy aquí"]);
    expect(seenBy(events, s, "p1")).toEqual(["estoy aquí"]);
  });

  it("el Jailor no ve los mensajes de sesión del Médium al encarcelado (Jailor.md:268)", () => {
    const s = withPrisonerSeance();
    const events = say(s, "p3", "seance", "hola, soy el Médium");
    expect(seenBy(events, s, "p2")).toEqual(["hola, soy el Médium"]);
    expect(seenBy(events, s, "p1")).toEqual([]);
  });

  it("con el Jailor seanceado, el encarcelado ve los mensajes de sesión del Jailor (Jailor.md:266)", () => {
    const s = withJailorSeance();
    const events = say(s, "p1", "seance", "te escucho, Médium");
    expect(seenBy(events, s, "p3")).toEqual(["te escucho, Médium"]);
    expect(seenBy(events, s, "p2")).toEqual(["te escucho, Médium"]);
  });

  it("con el Jailor seanceado, el encarcelado no oye al Médium (Jailor.md:266)", () => {
    const s = withJailorSeance();
    const events = say(s, "p3", "seance", "secreto del Médium");
    expect(seenBy(events, s, "p1")).toEqual(["secreto del Médium"]);
    expect(seenBy(events, s, "p2")).toEqual([]);
  });
});

describe("Médium muerto que hace sesión: no le oyen los muertos, pero él les oye (wiki: Medium.md:223)", () => {
  it("sus mensajes del canal de los muertos no llegan a otros muertos; él sí oye a los muertos", () => {
    // p1 Médium muerto con sesión con p2 (vivo); p3 muerto; p2 Investigator vivo.
    const s = dead(seance(dead(game(["medium", "investigator", "investigator", "godfather"]), "p1"), "p1", "p2"), "p3");
    const mine = say(s, "p1", "dead", "silencio entre muertos");
    expect(seenBy(mine, s, "p3")).toEqual([]);
    expect(seenBy(mine, s, "p1")).toEqual(["silencio entre muertos"]);
    const theirs = say(s, "p3", "dead", "os oigo");
    expect(seenBy(theirs, s, "p1")).toEqual(["os oigo"]);
  });
});

describe("Médium con sesión con un Mafioso: ve el canal de la Mafia (wiki: Medium.md:217-219; Jailor.md:268)", () => {
  // p1 Godfather vivo, p2 Mafioso vivo, p3 Médium muerto con sesión con p1, p4 Investigator vivo, p5 muerto.
  const s = seance(dead(game(["godfather", "mafioso", "medium", "investigator", "investigator"]), "p5"), "p3", "p1");

  it("el Médium que hace sesión con un Mafioso ve el canal de la Mafia", () => {
    const events = say(s, "p2", "mafia", "plan para esta noche");
    expect(seenBy(events, s, "p1")).toEqual(["plan para esta noche"]);
    expect(seenBy(events, s, "p3")).toEqual(["plan para esta noche"]);
    expect(seenBy(events, s, "p4")).toEqual([]);
    expect(seenBy(events, s, "p5")).toEqual([]);
  });
});

describe("Mafioso encarcelado: oye a su equipo, pero el equipo y los muertos no ven sus mensajes (wiki: Jailor.md:268)", () => {
  // p1 Mafioso encarcelado por p4 Jailor; p2 Godfather vivo; p3 muerto; p4 Jailor vivo.
  const s = jailed(dead(game(["mafioso", "godfather", "investigator", "jailor"]), "p3"), "p1", "p4");

  it("sus mensajes solo los ve él", () => {
    const events = say(s, "p1", "mafia", "no me dejéis solo");
    expect(seenBy(events, s, "p1")).toEqual(["no me dejéis solo"]);
    expect(seenBy(events, s, "p2")).toEqual([]);
    expect(seenBy(events, s, "p3")).toEqual([]);
  });

  it("sí oye a su equipo", () => {
    const events = say(s, "p2", "mafia", "aguanta");
    expect(seenBy(events, s, "p1")).toEqual(["aguanta"]);
  });
});
