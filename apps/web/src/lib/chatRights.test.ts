import { describe, expect, it } from "vitest";
import { chatRights, chatSenderLabel, whisperTarget } from "./chatRights.js";
import type { MatchView } from "../types.js";

/** Vista mínima: solo lo que mira chatRights. */
const view = (over: { phase?: MatchView["phase"]; status?: string; faction?: "town" | "mafia"; flags?: Record<string, boolean>; defendantId?: string | null; roleKey?: string | null }): MatchView =>
  ({
    phase: over.phase ?? "discussion",
    players: [{ id: "a", status: over.status ?? "alive" }, { id: "b", status: "alive" }],
    defendantId: over.defendantId ?? null,
    me: { id: "a", status: over.status ?? "alive", faction: over.faction ?? "town", flags: over.flags ?? {}, roleKey: over.roleKey ?? null, jail: null },
  }) as unknown as MatchView;

describe("quién puede escribir y por qué", () => {
  it("de día, los vivos hablan en la plaza", () => {
    expect(chatRights(view({ phase: "discussion" }))).toEqual({ channels: ["public", "whisper"], notice: null });
  });

  it("de noche solo habla la Mafia, y el resto recibe el aviso", () => {
    expect(chatRights(view({ phase: "night", faction: "mafia" })).channels).toEqual(["mafia"]);
    expect(chatRights(view({ phase: "night", faction: "town" }))).toEqual({ channels: [], notice: "De noche solo habla la Mafia." });
  });

  it("en defensa y últimas palabras solo habla el acusado", () => {
    expect(chatRights(view({ phase: "defense", defendantId: "a" })).channels).toEqual(["public", "whisper"]);
    expect(chatRights(view({ phase: "defense", defendantId: "b" })).notice).toBe("Solo habla el acusado.");
    expect(chatRights(view({ phase: "last_words", defendantId: "b" })).notice).toBe("Solo habla el acusado.");
  });

  it("un silenciado no escribe de día y lo dice", () => {
    expect(chatRights(view({ phase: "discussion", flags: { blackmailed: true } }))).toEqual({ channels: [], notice: "Estás silenciado durante el día." });
  });

  it("los muertos solo tienen Ultratumba", () => {
    expect(chatRights(view({ status: "dead" })).channels).toEqual(["dead"]);
  });

  it("el Médium vivo habla con los muertos de noche, salvo encarcelado", () => {
    expect(chatRights(view({ phase: "night", roleKey: "medium" })).channels).toEqual(["dead"]);
    expect(chatRights(view({ phase: "night", roleKey: "medium", flags: { jailed: true } })).channels).toEqual([]);
    expect(chatRights(view({ phase: "night", roleKey: "investigator" })).channels).toEqual([]);
  });
});

describe("Mayor revelado y susurros (wiki: Mayor.md:203)", () => {
  it("el Mayor revelado no ofrece susurros, pero sí la plaza", () => {
    expect(chatRights(view({ phase: "discussion", flags: { mayorRevealed: true } })).channels).toEqual(["public"]);
  });

  it("no se susurra a un Mayor revelado, y el susurro a otro sigue abierto", () => {
    const players = [
      { id: "a", status: "alive", mayorRevealed: false },
      { id: "b", status: "alive", mayorRevealed: true },
      { id: "c", status: "alive", mayorRevealed: false },
    ];
    expect(whisperTarget(players[1]!, "a")).toBe(false);
    expect(whisperTarget(players[2]!, "a")).toBe(true);
    expect(whisperTarget(players[0]!, "a")).toBe(false);
    const onlyMayor = { ...view({ phase: "discussion" }), players: [{ id: "a", status: "alive" }, { id: "b", status: "alive", mayorRevealed: true }] } as unknown as MatchView;
    expect(chatRights(onlyMayor).channels).toEqual(["public"]);
  });
});

describe("acusado silenciado (wiki: Blackmailer.md:213)", () => {
  it("en su defensa, el silenciado puede decir \"I am blackmailed.\" una vez", () => {
    const r = chatRights(view({ phase: "defense", defendantId: "a", flags: { blackmailed: true } }));
    expect(r.channels).toEqual(["public"]);
    expect(r.notice).toContain("I am blackmailed.");
    expect(chatRights(view({ phase: "defense", defendantId: "a", flags: { blackmailed: true, blackmailSpoke: true } }))).toEqual({ channels: [], notice: "Estás silenciado durante el día." });
  });

  it("no es el acusado, o no es su defensa: sigue silenciado", () => {
    expect(chatRights(view({ phase: "defense", defendantId: "b", flags: { blackmailed: true } })).channels).toEqual([]);
    expect(chatRights(view({ phase: "discussion", defendantId: "a", flags: { blackmailed: true } })).channels).toEqual([]);
  });
});

describe("quién aparece como autor", () => {
  const nick = (id: string) => ({ a: "Ana", b: "Bea" })[id] ?? "?";
  it("los muertos ven al Médium vivo como Medium, y el Médium se ve a sí mismo con su nick", () => {
    const dead = view({ status: "dead" });
    expect(chatSenderLabel(dead, { channel: "dead", senderId: "b", anonymous: true }, nick)).toBe("Medium");
    expect(chatSenderLabel(view({ roleKey: "medium" }), { channel: "dead", senderId: "a", anonymous: true }, nick)).toBe("Ana");
    expect(chatSenderLabel(dead, { channel: "dead", senderId: "b" }, nick)).toBe("Bea");
  });
});
