import { describe, expect, it } from "vitest";
import { chatRights, chatSenderLabel, whisperTarget } from "./chatRights.js";
import type { MatchView } from "../types.js";

/** Vista mínima: solo lo que mira chatRights. */
const view = (over: {
  phase?: MatchView["phase"];
  status?: string;
  faction?: "town" | "mafia";
  flags?: Record<string, boolean>;
  defendantId?: string | null;
  roleKey?: string | null;
  jail?: "jailor" | "prisoner" | null;
  seance?: "medium" | "target" | null;
  seanceTarget?: { mafia: boolean; jail: boolean } | null;
}): MatchView =>
  ({
    phase: over.phase ?? "discussion",
    players: [{ id: "a", status: over.status ?? "alive" }, { id: "b", status: "alive" }],
    defendantId: over.defendantId ?? null,
    me: {
      id: "a",
      status: over.status ?? "alive",
      faction: over.faction ?? "town",
      flags: over.flags ?? {},
      roleKey: over.roleKey ?? null,
      jail: over.jail ?? null,
      seance: over.seance ?? null,
      seanceTarget: over.seanceTarget ?? null,
    },
  }) as unknown as MatchView;

/** Sin canales de solo lectura: lo habitual fuera de la sesión de Médium y de la cárcel del Médium. */
const writable = (channels: string[]) => ({ channels, readOnly: [], notice: null });

describe("quién puede escribir y por qué", () => {
  it("de día, los vivos hablan en la plaza", () => {
    expect(chatRights(view({ phase: "discussion" }))).toEqual({ channels: ["public", "whisper"], readOnly: [], notice: null });
  });

  it("de noche solo habla la Mafia, y el resto recibe el aviso", () => {
    expect(chatRights(view({ phase: "night", faction: "mafia" })).channels).toEqual(["mafia"]);
    expect(chatRights(view({ phase: "night", faction: "town" }))).toEqual({ channels: [], readOnly: [], notice: "De noche solo habla la Mafia." });
  });

  it("en defensa y últimas palabras solo habla el acusado", () => {
    expect(chatRights(view({ phase: "defense", defendantId: "a" })).channels).toEqual(["public", "whisper"]);
    expect(chatRights(view({ phase: "defense", defendantId: "b" })).notice).toBe("Solo habla el acusado.");
    expect(chatRights(view({ phase: "last_words", defendantId: "b" })).notice).toBe("Solo habla el acusado.");
  });

  it("un silenciado puede intentar hablar o susurrar: el motor le responde con el mensaje de la wiki (Blackmailer.md:209, 211)", () => {
    expect(chatRights(view({ phase: "discussion", flags: { blackmailed: true } }))).toEqual({ channels: ["public", "whisper"], readOnly: [], notice: null });
  });

  it("los muertos solo tienen Ultratumba, y lo pueden escribir", () => {
    expect(chatRights(view({ status: "dead" }))).toEqual(writable(["dead"]));
  });

  it("el Médium vivo habla con los muertos de noche (Medium.md:186, 189)", () => {
    expect(chatRights(view({ phase: "night", roleKey: "medium" }))).toEqual(writable(["dead"]));
    expect(chatRights(view({ phase: "night", roleKey: "investigator" })).channels).toEqual([]);
  });

  it("encarcelado, el Médium oye a los muertos pero no les habla (Medium.md:201)", () => {
    const r = chatRights(view({ phase: "night", roleKey: "medium", flags: { jailed: true }, jail: "prisoner" }));
    expect(r.channels).toEqual(["jail", "dead"]);
    expect(r.readOnly).toEqual(["dead"]);
    expect(r.notice).toBeNull();
  });

  it("encarcelado, el Médium solo habla con su Jailor, por el canal de cárcel (Medium.md:201)", () => {
    const r = chatRights(view({ phase: "night", roleKey: "medium", flags: { jailed: true }, jail: "prisoner" }));
    expect(r.readOnly).not.toContain("jail");
    expect(r.channels).toContain("jail");
  });

  it("encarcelado y de día, el Médium no tiene Ultratumba: los muertos solo hablan de noche", () => {
    expect(chatRights(view({ phase: "discussion", roleKey: "medium", flags: { jailed: true }, jail: "prisoner" }))).toEqual({ channels: ["public", "whisper", "jail"], readOnly: [], notice: null });
  });
});

describe("Mayor revelado y susurros (wiki: Mayor.md:203)", () => {
  it("el Mayor revelado puede intentar susurrar y recibe el mensaje de la wiki (Mayor.md:401)", () => {
    expect(chatRights(view({ phase: "discussion", flags: { mayorRevealed: true } })).channels).toEqual(["public", "whisper"]);
  });

  it("se puede intentar susurrar a un Mayor revelado, que recibe el aviso (Mayor.md:397)", () => {
    const players = [
      { id: "a", status: "alive", mayorRevealed: false },
      { id: "b", status: "alive", mayorRevealed: true },
      { id: "c", status: "alive", mayorRevealed: false },
    ];
    expect(whisperTarget(players[1]!, "a")).toBe(true);
    expect(whisperTarget(players[2]!, "a")).toBe(true);
    expect(whisperTarget(players[0]!, "a")).toBe(false);
    const onlyMayor = { ...view({ phase: "discussion" }), players: [{ id: "a", status: "alive" }, { id: "b", status: "alive", mayorRevealed: true }] } as unknown as MatchView;
    expect(chatRights(onlyMayor).channels).toEqual(["public", "whisper"]);
  });
});

describe("acusado silenciado (wiki: Blackmailer.md:213)", () => {
  it("en su defensa, el silenciado puede decir \"I am blackmailed.\" una vez", () => {
    const r = chatRights(view({ phase: "defense", defendantId: "a", flags: { blackmailed: true } }));
    expect(r.channels).toEqual(["public"]);
    expect(r.notice).toContain("I am blackmailed.");
    expect(chatRights(view({ phase: "defense", defendantId: "a", flags: { blackmailed: true, blackmailSpoke: true } })).notice).toBeNull();
  });

  it("no es el acusado, o no es su defensa: sigue silenciado", () => {
    expect(chatRights(view({ phase: "defense", defendantId: "b", flags: { blackmailed: true } })).notice).toBe("Solo habla el acusado.");
    expect(chatRights(view({ phase: "discussion", defendantId: "a", flags: { blackmailed: true } })).channels).toEqual(["public", "whisper"]);
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

describe("Médium con sesión: canales que solo lee (wiki: Medium.md:217-223)", () => {
  it("el Médium muerto escribe en la sesión, y el Ultratumba es solo de lectura (Medium.md:223)", () => {
    const r = chatRights(view({ status: "dead", phase: "night", roleKey: "medium", seance: "medium", seanceTarget: { mafia: false, jail: false } }));
    expect(r.channels).toEqual(["seance", "dead"]);
    expect(r.readOnly).toEqual(["dead"]);
    expect(r.notice).toBeNull();
  });

  it("con objetivo de la Mafia, ve el canal de la Mafia solo para leer (Medium.md:217-219)", () => {
    const r = chatRights(view({ status: "dead", phase: "night", seance: "medium", seanceTarget: { mafia: true, jail: false } }));
    expect(r.channels).toEqual(["seance", "dead", "mafia"]);
    expect(r.readOnly).toEqual(["dead", "mafia"]);
  });

  it("con objetivo encarcelado, ve el canal de cárcel solo para leer (Medium.md:217)", () => {
    const r = chatRights(view({ status: "dead", phase: "night", seance: "medium", seanceTarget: { mafia: false, jail: true } }));
    expect(r.channels).toEqual(["seance", "dead", "jail"]);
    expect(r.readOnly).toEqual(["dead", "jail"]);
  });

  it("con objetivo Jailor, ve también el canal de cárcel solo para leer (Medium.md:217)", () => {
    const r = chatRights(view({ status: "dead", phase: "night", seance: "medium", seanceTarget: { mafia: false, jail: true } }));
    expect(r.readOnly).toContain("jail");
    expect(r.channels).not.toContain("mafia");
  });

  it("con un objetivo que no es de la Mafia ni está en cárcel, no ve más canales", () => {
    const r = chatRights(view({ status: "dead", phase: "night", seance: "medium", seanceTarget: { mafia: false, jail: false } }));
    expect(r.channels).toEqual(["seance", "dead"]);
  });

  it("de día, el Médium muerto solo tiene Ultratumba: la sesión se abre de noche", () => {
    expect(chatRights(view({ status: "dead", phase: "discussion", seance: null, seanceTarget: null }))).toEqual(writable(["dead"]));
  });

  it("el vivo elegido por el Médium habla en la sesión, sin canales de solo lectura (Medium.md:217)", () => {
    expect(chatRights(view({ phase: "night", seance: "target" }))).toEqual(writable(["seance"]));
  });

  it("el objetivo Mafia escribe en el canal de la Mafia; el Médium no (Medium.md:217)", () => {
    const r = chatRights(view({ phase: "night", faction: "mafia", seance: "target" }));
    expect(r.channels).toEqual(["mafia", "seance"]);
    expect(r.readOnly).toEqual([]);
  });

  it("el objetivo encarcelado escribe en su canal de cárcel, que es suyo", () => {
    const r = chatRights(view({ phase: "night", jail: "prisoner", seance: "target" }));
    expect(r.channels).toEqual(["jail", "seance"]);
    expect(r.readOnly).toEqual([]);
  });
});
