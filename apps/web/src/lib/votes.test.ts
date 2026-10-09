import { describe, expect, it } from "vitest";
import { voteStatus } from "./votes.js";
import type { MatchView } from "../types.js";

const player = (id: string, nick: string, status = "alive", connected = true) => ({ id, nick, status, connected });

describe("recuento de votos", () => {
  it("pide la mayoría de los que pueden votar", () => {
    const view = { players: [player("a", "Ana"), player("b", "Bea"), player("c", "Caro"), player("d", "Dani", "dead")], votes: {} } as unknown as MatchView;
    expect(voteStatus(view).needed).toBe(2);
  });

  it("el más votado va primero, y las abstenciones no cuentan", () => {
    const view = {
      players: [player("a", "Ana"), player("b", "Bea"), player("c", "Caro")],
      votes: { a: "c", b: "c", c: null },
    } as unknown as MatchView;
    expect(voteStatus(view).leader).toEqual({ nick: "Caro", count: 2 });
  });
});
