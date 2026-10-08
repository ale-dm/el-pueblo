import { describe, expect, it } from "vitest";
import { canSee, projectFor } from "../src/projection/visibility.js";
import type { PlayerState } from "../src/types/state.js";

const player = (id: string, faction: "town" | "mafia", status: PlayerState["status"] = "alive"): PlayerState => ({
  id, seat: 1, nick: id, roleKey: null, faction, status, connected: true, deathReason: null,
});
const town = player("t", "town");
const mafia = player("m", "mafia");
const deadTown = player("d", "town", "dead");

describe("canSee", () => {
  it("el chat público lo ve todo el mundo", () => {
    expect(canSee({ visibility: "public", audiencePlayerId: null }, deadTown)).toBe(true);
  });

  it("el chat de la mafia solo lo ve la mafia viva", () => {
    const e = { visibility: "mafia" as const, audiencePlayerId: null };
    expect(canSee(e, mafia)).toBe(true);
    expect(canSee(e, town)).toBe(false);
    expect(canSee(e, player("m2", "mafia", "dead"))).toBe(false);
  });

  it("el chat de muertos solo lo ven los muertos", () => {
    const e = { visibility: "dead" as const, audiencePlayerId: null };
    expect(canSee(e, deadTown)).toBe(true);
    expect(canSee(e, town)).toBe(false);
  });

  it("un evento privado lo ve solo su destinatario", () => {
    const e = { visibility: "private" as const, audiencePlayerId: "t" };
    expect(canSee(e, town)).toBe(true);
    expect(canSee(e, mafia)).toBe(false);
  });
});

describe("projectFor", () => {
  it("filtra la lista de eventos según el espectador y conserva el orden", () => {
    const events = [
      { seq: 1, visibility: "public" as const, audiencePlayerId: null },
      { seq: 2, visibility: "mafia" as const, audiencePlayerId: null },
      { seq: 3, visibility: "private" as const, audiencePlayerId: "t" },
    ];
    expect(projectFor(events, town).map((e) => e.seq)).toEqual([1, 3]);
    expect(projectFor(events, mafia).map((e) => e.seq)).toEqual([1, 2]);
  });
});
