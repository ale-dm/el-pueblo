import { describe, expect, it } from "vitest";
import { chatRights } from "./chatRights.js";
import type { MatchView } from "../types.js";

/** Vista mínima: solo lo que mira chatRights. */
const view = (over: { phase?: MatchView["phase"]; status?: string; faction?: "town" | "mafia"; flags?: Record<string, boolean>; defendantId?: string | null }): MatchView =>
  ({
    phase: over.phase ?? "discussion",
    players: [{ id: "a", status: over.status ?? "alive" }, { id: "b", status: "alive" }],
    defendantId: over.defendantId ?? null,
    me: { id: "a", status: over.status ?? "alive", faction: over.faction ?? "town", flags: over.flags ?? {} },
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
});
