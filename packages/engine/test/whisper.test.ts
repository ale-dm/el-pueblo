import { describe, expect, it } from "vitest";
import { apply } from "../src/core/apply.js";
import { decide } from "../src/core/decide.js";
import { projectFor } from "../src/projection/visibility.js";
import type { GameEventEnvelope } from "../src/types/events.js";
import type { GameState } from "../src/types/state.js";
import { applyAll, ctx, game, rejected } from "./helpers/game.js";

const whisper = (s: GameState, from: string, to: string, text = "hola") =>
  decide(s, { type: "chat.send", senderId: from, channel: "whisper", text, recipientId: to }, ctx());

/** Motivo del rechazo que la wiki comunica como mensaje al emisor (chat.refused), o null si el chat se acepta. */
const refusalOf = (s: GameState, cmd: Parameters<typeof decide>[1]) => {
  const r = decide(s, cmd, ctx());
  if (!r.ok) throw new Error(`error inesperado: ${r.error.message}`);
  const refused = r.value.filter((e) => e.type === "chat.refused");
  if (refused.length === 0) return null;
  expect(r.value.filter((e) => e.type === "chat.message")).toHaveLength(0);
  return refused.map((e) => [e.audiencePlayerId, (e.payload as { reason: string }).reason]);
};

describe("susurros", () => {
  it("se registran para quien susurra y para quien recibe, y nadie más los ve", () => {
    const s = game(["doctor", "godfather", "investigator"], { phase: "discussion", dayNumber: 2 });
    const r = whisper(s, "p1", "p3");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(2);
    const after = r.value.reduce(apply, s);
    const seenBy = (id: string) => projectFor(r.value, after.players.find((p) => p.id === id)!).length;
    expect(seenBy("p1")).toBe(1); // quien susurra
    expect(seenBy("p3")).toBe(1); // quien recibe
    expect(seenBy("p2")).toBe(0); // la Mafia no lo ve
  });

  it("solo de día, entre vivos, y no a uno mismo", () => {
    expect(whisper(game(["doctor", "godfather"], { phase: "night", dayNumber: 2 }), "p1", "p2").ok).toBe(false);
    expect(whisper(game(["doctor", "godfather"], { phase: "discussion", dayNumber: 2 }), "p1", "p1").ok).toBe(false);
    const dead = game(["doctor", "godfather"], { phase: "discussion", dayNumber: 2 });
    dead.players[1]!.status = "dead";
    expect(whisper(dead, "p1", "p2").ok).toBe(false);
  });

  it("un silenciado no susurra: recibe el mensaje de la wiki, y nadie ve el susurro (Blackmailer.md:211)", () => {
    const s = game(["doctor", "godfather"], { phase: "discussion", dayNumber: 2 });
    s.players[0]!.flags = { blackmailed: true };
    expect(refusalOf(s, { type: "chat.send", senderId: "p1", channel: "whisper", text: "hola", recipientId: "p2" })).toEqual([["p1", "blackmailed_whisper"]]);
  });

  it("no sirve el canal de susurro sin destinatario", () => {
    const s = game(["doctor", "godfather"], { phase: "discussion", dayNumber: 2 });
    expect(decide(s, { type: "chat.send", senderId: "p1", channel: "whisper", text: "x" }, ctx()).ok).toBe(false);
  });
});

describe("Mayor revelado y susurros (wiki: Mayor.md:203)", () => {
  const revealed = (s: GameState, id: string) => {
    s.players.find((p) => p.id === id)!.flags = { mayorRevealed: true };
    return s;
  };

  it("un Mayor revelado no susurra: el mensaje de la wiki va al emisor (Mayor.md:401)", () => {
    const s = revealed(game(["mayor", "godfather"], { phase: "discussion", dayNumber: 2 }), "p1");
    expect(refusalOf(s, { type: "chat.send", senderId: "p1", channel: "whisper", text: "hola", recipientId: "p2" })).toEqual([["p1", "mayor_revealed_whisper"]]);
  });

  it("nadie susurra a un Mayor revelado: el mensaje de la wiki va al emisor (Mayor.md:397)", () => {
    const s = revealed(game(["doctor", "mayor"], { phase: "discussion", dayNumber: 2 }), "p2");
    expect(refusalOf(s, { type: "chat.send", senderId: "p1", channel: "whisper", text: "hola", recipientId: "p2" })).toEqual([["p1", "whisper_to_mayor"]]);
  });

  it("antes de revelarse el Mayor sí susurra, y sigue sin poder hacerlo al revelarse", () => {
    const s = game(["mayor", "doctor"], { phase: "discussion", dayNumber: 2 });
    expect(whisper(s, "p1", "p2").ok).toBe(true);
    expect(refusalOf(revealed(s, "p1"), { type: "chat.send", senderId: "p1", channel: "whisper", text: "hola", recipientId: "p2" })).toEqual([["p1", "mayor_revealed_whisper"]]);
  });
});

describe("Blackmailer oye los susurros (wiki: Blackmailer.md:207, 227, 375)", () => {
  it("un Blackmailer vivo oye el susurro entre otros dos, y el resto no", () => {
    const s = game(["blackmailer", "doctor", "godfather", "investigator"], { phase: "discussion", dayNumber: 2 });
    const r = whisper(s, "p2", "p3");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const after = r.value.reduce(apply, s);
    const seenBy = (id: string) => projectFor(r.value, after.players.find((p) => p.id === id)!);
    expect(seenBy("p1")).toHaveLength(1);
    expect(seenBy("p1")[0]).toMatchObject({ type: "chat.message", payload: { channel: "whisper", text: "hola", senderId: "p2", recipientId: "p3" } });
    expect(seenBy("p4")).toHaveLength(0);
  });

  it("un Blackmailer muerto sigue oyendo los susurros", () => {
    const s = game(["blackmailer", "doctor", "godfather"], { phase: "discussion", dayNumber: 2 });
    s.players[0]!.status = "dead";
    const r = whisper(s, "p2", "p3");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(projectFor(r.value, s.players[0]!)).toHaveLength(1);
  });

  it("el Blackmailer que susurra ve su propio susurro una sola vez", () => {
    const s = game(["blackmailer", "doctor"], { phase: "discussion", dayNumber: 2 });
    const r = whisper(s, "p1", "p2");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(2);
    expect(projectFor(r.value, s.players[0]!)).toHaveLength(1);
  });
});

describe("Acusado silenciado: \"I am blackmailed.\" (wiki: Blackmailer.md:213)", () => {
  const defending = (over: Partial<GameState["players"][number]["flags"]> = {}) => {
    const s = game(["blackmailer", "doctor", "godfather"], { phase: "defense", dayNumber: 2, defendantId: "p2" });
    s.players[1] = { ...s.players[1]!, flags: { blackmailed: true, ...over } };
    return s;
  };
  const say = (s: GameState, senderId: string, text = "Soy inocente") =>
    decide(s, { type: "chat.send", senderId, channel: "public", text }, ctx());

  it("el acusado silenciado en su defensa dice \"I am blackmailed.\", aunque escriba otra cosa", () => {
    const r = say(defending(), "p2");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value[0]).toMatchObject({ type: "chat.message", payload: { channel: "public", text: "I am blackmailed." } });
  });

  it("solo una vez por juicio", () => {
    const s = defending();
    const first = say(s, "p2");
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const after = applyAll(s, first.value);
    expect(after.players[1]!.flags.blackmailSpoke).toBe(true);
    expect(refusalOf(after, { type: "chat.send", senderId: "p2", channel: "public", text: "otra vez" })).toEqual([["p2", "blackmailed"]]);
  });

  it("un nuevo juicio el mismo día le deja decirlo otra vez", () => {
    const s = defending({ blackmailSpoke: true });
    const next = applyAll(s, [{ seq: 1, type: "trial.started", payload: { defendantId: "p2" }, visibility: "public", audiencePlayerId: null }] as GameEventEnvelope[]);
    expect(next.players[1]!.flags.blackmailSpoke).toBeUndefined();
    expect(say(next, "p2").ok).toBe(true);
  });

  it("fuera de su defensa, o si no es el acusado, sigue sin poder hablar: el mensaje de la wiki va al emisor", () => {
    expect(refusalOf({ ...defending(), phase: "discussion" }, { type: "chat.send", senderId: "p2", channel: "public", text: "hola" })).toEqual([["p2", "blackmailed"]]);
    expect(refusalOf(defending(), { type: "chat.send", senderId: "p2", channel: "public", text: "hola" })).toBeNull();
    const notDefendant = { ...defending(), defendantId: "p3" };
    expect(refusalOf(notDefendant, { type: "chat.send", senderId: "p2", channel: "public", text: "hola" })).toEqual([["p2", "blackmailed"]]);
  });
});
